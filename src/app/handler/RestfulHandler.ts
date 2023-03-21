import {DatabaseComponent, WhereBuilder, WhereCondition} from '@sora-soft/database-component';
import {FindManyOptions, FindOptionsOrder, FindOptionsRelations, ObjectLiteral, FindOptionsOrderValue} from '@sora-soft/database-component/typeorm';
import {ExError, Route, Service} from '@sora-soft/framework';
import {ValidateClass, AssertType} from '@sora-soft/type-guard';
import {AppErrorCode, UserErrorCode} from '../ErrorCode.js';
import {UserError} from '../UserError.js';
import {validate} from 'class-validator';
import {AppError} from '../AppError.js';
import {Util} from '../../lib/Utility.js';
import {AuthRoute} from '../../lib/route/AuthRoute.js';

type EntityValueTypeProperty<T, V> = T extends Array<any> ? V : T extends string ? never : T extends number ? never : T extends V ? never : T extends Function ? never : T extends object ? EntityValueType<T> | V : V
type EntityValueType<T> = {
  [k in keyof T]?: EntityValueTypeProperty<T[k], boolean>;
}
export interface IRestfulHandlerCom<T = unknown> {
  name: string;
  com: DatabaseComponent;
  entity: new () => T;
  select?: string[];
}

export type RestfulHandlerComList = IRestfulHandlerCom[];

export interface IRestfulReq {
  db: string;
}

export interface IReqFetch<T> {
  db: string;
  offset?: number;
  limit?: number;
  relations?: EntityValueType<T>;
  order?: {
    [k in keyof T]?: FindOptionsOrderValue;
  };
  select?: string[];
  where?: WhereCondition<T>;
}

export interface IReqUpdate<T> {
  data: Partial<T>;
  where: WhereCondition<T>;
  db: string;
}

export interface IReqUpdateBatch<T> {
  db: string;
  list: {
    where: WhereCondition<T>;
    data: Partial<T>;
  }[];
}

export interface IReqInsert<T> {
  db: string;
  data: Partial<T>;
}

export interface IReqInsertBatch<T> {
  db: string;
  list: Partial<T>[];
}

export interface IReqDelete<T> {
  db: string;
  where: WhereCondition<T>;
}

export interface IReqDeleteBatch<T> {
  db: string;
  where: WhereCondition<T>[];
}

@ValidateClass()
class RestfulHandler extends AuthRoute {
  constructor(service: Service, list: RestfulHandlerComList) {
    super(service);
    this.dbMap_ = new Map();
    for(const data of list) {
      this.dbMap_.set(data.name, data);
    }
  }

  @Route.method
  @AuthRoute.restful()
  async fetch<T extends ObjectLiteral>(@AssertType() body: IReqFetch<T>) {
    const {com, entity, select} = this.getPair<T>(body.db);

    const query: FindManyOptions<T> = {};
    const finalSelect: string[] = [];
    if (body.select) {
      body.select.forEach((key: string) => {
        if (!select || select.includes(key)) {
          finalSelect.push(key);
        }
      });
    } else {
      if (select) {
        for (const key of select) {
          finalSelect.push(key);
        }
      }
    }
    if (finalSelect.length) {
      query.select = finalSelect;
    }

    if (Util.isMeaningful(body.offset)) {
      query.skip = body.offset;
    }

    if (Util.isMeaningful(body.limit)) {
      query.take = body.limit;
    }

    if (Util.isMeaningful(body.relations)) {
      query.relations = body.relations as FindOptionsRelations<T>;
    }

    if (Util.isMeaningful(body.where)) {
      query.where = WhereBuilder.build(body.where);
    }

    if (Util.isMeaningful(body.order)) {
      query.order = body.order as FindOptionsOrder<T>;
    }

    const [list, total] = await com.manager.findAndCount(entity, query);
    return {
      list,
      total,
    } as { list: Array<T>; total: number };
  }

  @Route.method
  @AuthRoute.restful()
  async insert<T extends ObjectLiteral>(@AssertType() body: IReqInsert<T>) {
    const {com, entity} = this.getPair<T>(body.db);

    const data = await this.installData<T>(entity, body.data);

    const result = await com.manager.insert(entity, data).catch((err: ExError) => {
      throw new AppError(AppErrorCode.ERR_DATABASE, err.message);
    });

    return result.raw as T;
  }

  @Route.method
  @AuthRoute.restful('insert')
  async insertBatch<T extends ObjectLiteral>(@AssertType() body: IReqInsertBatch<T>) {
    const {com, entity} = this.getPair<T>(body.db);

    const list: T[] = [];
    for (const d of body.list) {
      const data = await this.installData<T>(entity, d);
      list.push(data);
    }

    const result = await com.manager.save(list).catch((err: ExError) => {
      throw new AppError(AppErrorCode.ERR_DATABASE, err.message);
    });

    return result;
  }

  @Route.method
  @AuthRoute.restful()
  async update<T extends ObjectLiteral>(@AssertType() body: IReqUpdate<T>) {
    const {com, entity} = this.getPair<T>(body.db);

    const data = await this.installData<T>(entity, body.data);

    await com.manager.update(entity, body.where, data);

    return {};
  }

  @Route.method
  @AuthRoute.restful('update')
  async updateBatch<T extends ObjectLiteral>(@AssertType() body: IReqUpdateBatch<T>) {
    const {com, entity} = this.getPair<T>(body.db);

    await com.manager.transaction(async (manager) => {
      for (const d of body.list) {
        const data = await this.installData<T>(entity, d.data);
        await manager.update(entity, d.where, data);
      }
    });

    return {};
  }

  @Route.method
  @AuthRoute.restful()
  async delete<T extends ObjectLiteral>(@AssertType() body: IReqDelete<T>) {
    const {com, entity} = this.getPair<T>(body.db);

    await com.manager.delete(entity, body.where);
    return {};
  }

  @Route.method
  @AuthRoute.restful('delete')
  async deleteBatch<T extends ObjectLiteral>(@AssertType() body: IReqDeleteBatch<T>) {
    const {com, entity} = this.getPair<T>(body.db);
    await com.manager.delete(entity, body.where);

    return {};
  }

  private getPair<T extends ObjectLiteral>(name: string) {
    const pair = this.dbMap_.get(name);
    if (!pair)
      throw new UserError(UserErrorCode.ERR_DB_NOT_FOUND, `ERR_DB_NOT_FOUND, db=${name}`);
    return pair as IRestfulHandlerCom<T>;
  }

  private async installData<T>(entity: new () => T, data: Object) {
    const result = new entity() ;
    for (const [key, value] of Object.entries(data)) {
      result[key as keyof T] = value as T[keyof T];
    }

    const errors = await validate(data);
    if (errors.length) {
      throw new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID, property=[${errors.map(e => e.property).join(',')}]`);
    }

    return result ;
  }

  private dbMap_: Map<string, IRestfulHandlerCom>;
}


export {RestfulHandler};
