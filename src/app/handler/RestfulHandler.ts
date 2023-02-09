import {DatabaseComponent, EntityTarget, FindManyOptions, FindOptionsOrder, FindOptionsRelations, ObjectLiteral, WhereBuilder, WhereCondition, FindOptionsOrderValue} from '@sora-soft/database-component';
import {Route, Service, Request} from '@sora-soft/framework';
import {ValidateClass, AssertType} from 'typescript-is';
import {AppErrorCode, UserErrorCode} from '../ErrorCode';
import {UserError} from '../UserError';
import {validate} from 'class-validator';
import {AccountWorld} from '../account/AccountWorld';
import {AuthGroupId} from '../account/AccountType';
import {AppError} from '../AppError';
import {Util} from '../../lib/Utility';

type EntityValueType<T, V> = T extends Array<any> ? V : T extends string ? never : T extends number ? never : T extends V ? never : T extends Function ? never : T extends object ? V : V;
export interface IRestfulHandlerCom<T = unknown> {
  name: string;
  com: DatabaseComponent;
  entity: EntityTarget<T>;
  select?: string[];
}

export type RestfulHandlerComList = IRestfulHandlerCom[];

export interface IReqFetch<T> {
  db: string;
  offset?: number;
  limit?: number;
  relations?: {
    [k in keyof T]?: EntityValueType<T, boolean>;
  };
  order?: {
    [k in keyof T]?: EntityValueType<T, FindOptionsOrderValue>;
  };
  select?: string[];
  where?: WhereCondition<T>;
}

export interface IReqUpdate<T> {
  data: Partial<T>;
  id: any;
  db: string;
}

export interface IReqUpdateBatch<T> {
  db: string;
  list: {
    id: any;
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

export interface IReqDeleteBatch {
  db: string;
  list: any[];
}

@ValidateClass()
class RestfulHandler extends Route {
  static async authChecker(gid: AuthGroupId, service: string, method: string, request: Request<{db: string}>) {
    const methodConvertMap = {
      fetch: 'fetch',
      insert: 'insert',
      insertBatch: 'insert',
      update: 'update',
      updateBatch: 'update',
      deleteBatch: 'delete',
    }
    const db = request.payload.db;
    return AccountWorld.hasAuth(gid, [service, methodConvertMap[method], db].join('.'));
  }

  constructor(list: RestfulHandlerComList) {
    super();
    this.dbMap_ = new Map();
    for(const data of list) {
      this.dbMap_.set(data.name, data);
    }
  }

  @Route.method
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
    } as { list: Array<T>, total: number }
  }

  @Route.method
  async insert<T extends ObjectLiteral>(@AssertType() body: IReqInsert<T>) {
    const {com, entity} = this.getPair<T>(body.db);

    const data = await this.installData<T>(entity, body.data);

    const result = await com.manager.insert(entity, data as any).catch(err => {
      throw new AppError(AppErrorCode.ERR_DATABASE, err.message);
    });

    return result.raw as T;
  }

  @Route.method
  async insertBatch<T extends ObjectLiteral>(@AssertType() body: IReqInsertBatch<T>) {
    const {com, entity} = this.getPair<T>(body.db);

    const list: T[] = [];
    for (const d of body.list) {
      const data = await this.installData<T>(entity, d);
      list.push(data);
    }

    const result = await com.manager.save(list).catch(err => {
      throw new AppError(AppErrorCode.ERR_DATABASE, err.message);
    });

    return result;
  }

  @Route.method
  async update<T extends ObjectLiteral>(@AssertType() body: IReqUpdate<T>) {
    const {com, entity} = this.getPair<T>(body.db);

    const data = await this.installData<T>(entity, body.data);

    await com.manager.update(entity, body.id, data);

    return {};
  }

  @Route.method
  async updateBatch<T extends ObjectLiteral>(@AssertType() body: IReqUpdateBatch<T>) {
    const {com, entity} = this.getPair<T>(body.db);

    await com.manager.transaction(async (manager) => {
      for (const d of body.list) {
        const data = await this.installData<T>(entity, d.data);
        await manager.update(entity, d.id, data);
      }
    });

    return {};
  }

  @Route.method
  async deleteBatch<T extends ObjectLiteral>(@AssertType() body: IReqDeleteBatch) {
    const {com, entity} = this.getPair<T>(body.db);
    await com.manager.delete(entity, body.list);

    return {};
  }

  private getPair<T extends ObjectLiteral>(name: string) {
    const pair = this.dbMap_.get(name);
    if (!pair)
      throw new UserError(UserErrorCode.ERR_DB_NOT_FOUND, `ERR_DB_NOT_FOUND, db=${name}`);
    return pair as IRestfulHandlerCom<T>;
  }

  private async installData<T>(entity: any, data: any) {
    const result = new entity();
    for (const [key, value] of Object.entries(data)) {
      result[key] = value;
    }

    const errors = await validate(data);
    if (errors.length) {
      throw new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID, property=[${errors.map(e => e.property).join(',')}]`);
    }

    return result as T;
  }

  private dbMap_: Map<string, IRestfulHandlerCom>;
}


export {RestfulHandler}
