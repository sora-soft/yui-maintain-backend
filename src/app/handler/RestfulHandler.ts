import {DatabaseComponent, EntityTarget} from '@sora-soft/database-component';
import {Route, Service, Request, Response} from '@sora-soft/framework';
import {ValidateClass, AssertType} from 'typescript-is';
import {UserErrorCode} from '../ErrorCode';
import {UserError} from '../UserError';
import {validate} from 'class-validator';
import {AccountWorld} from '../account/AccountWorld';
import {ForwardRPCHeader} from '../../lib/Const';

export interface IRestfulHandlerCom {
  name: string;
  com: DatabaseComponent,
  entity: any;
}

export type RestfulHandlerComList = IRestfulHandlerCom[];

export interface IReqFetch {
  db: string;
  offset: number;
  limit: number;
  where?: any;
}

export interface IReqUpdate {
  data: any;
  id: any;
  db: string;
}

export interface IReqUpdateBatch {
  db: string;
  list: {
    id: any;
    data: any;
  }[];
}

export interface IReqInsert {
  db: string;
  data: any;
}

export interface IReqInsertBatch {
  db: string;
  list: any[];
}

export interface IReqDeleteBatch {
  db: string;
  list: any[];
}

@ValidateClass()
class RestfulHandler extends Route {
  static auth(name: string) {
    return (target: RestfulHandler, propertyKey: string, descriptor: PropertyDescriptor) => {
      const origin = descriptor.value;
      descriptor.value = async function (body: {db: string}, request: Request<{db: string}>, response: Response) {
        if (request.getHeader(ForwardRPCHeader.RPC_NEED_AUTH_CHECK)) {
          const authCheck = await AccountWorld.hasAuth(request.getHeader(ForwardRPCHeader.RPC_AUTH_GID), `${this.getAuthName(name, body.db)}`);
          if (!authCheck)
            throw new UserError(UserErrorCode.ERR_AUTH_DENY, `ERR_AUTH_DENY, name=${this.getAuthName(name, body.db)}`);
        }
        return origin.bind(this)(body, request, response);
      }
    };
  }

  constructor(service: Service, list: RestfulHandlerComList) {
    super(service);
    this.dbMap_ = new Map();
    for(const data of list) {
      this.dbMap_.set(data.name, data);
    }
  }

  @Route.method
  @RestfulHandler.auth('fetch')
  async fetch(@AssertType() body: IReqFetch, request: Request<IReqFetch>) {
    const {com, entity} = this.getPair(body.db);
    const [list, total] = await com.manager.findAndCount(entity, {
      take: body.limit,
      from: body.offset,
      where: body.where,
    });
    return {
      list,
      total,
    }
  }

  @Route.method
  @RestfulHandler.auth('insert')
  async insert(@AssertType() body: IReqInsert, request: Request<IReqInsert>) {
    const {com, entity} = this.getPair(body.db);

    const data = await this.installData(entity, body.data);

    const result = await com.manager.save(data);

    return result;
  }

  @Route.method
  @RestfulHandler.auth('insert')
  async insertBatch(@AssertType() body: IReqInsertBatch, request: Request<IReqInsertBatch>) {
    const {com, entity} = this.getPair(body.db);

    const list = [];
    for (const d of body.list) {
      const data = await this.installData(entity, d);
      list.push(data);
    }

    const result = await com.manager.save(list);

    return result;
  }

  @Route.method
  @RestfulHandler.auth('update')
  async update(@AssertType() body: IReqUpdate, request: Request<IReqUpdate>) {
    const {com, entity} = this.getPair(body.db);

    const data = await this.installData(entity, body.data);

    await com.manager.update(entity, body.id, data);

    return {};
  }

  @Route.method
  @RestfulHandler.auth('update')
  async updateBatch(@AssertType() body: IReqUpdateBatch, request: Request<IReqUpdateBatch>) {
    const {com, entity} = this.getPair(body.db);

    await com.manager.transaction(async (manager) => {
      for (const d of body.list) {
        const data = await this.installData(entity, d.data);
        await manager.update(entity, d.id, data);
      }
    });

    return {};
  }

  @Route.method
  @RestfulHandler.auth('delete')
  async deleteBatch(@AssertType() body: IReqDeleteBatch, request: Request<IReqUpdateBatch>) {
    const {com, entity} = this.getPair(body.db);
    await com.manager.delete(entity, body.list);

    return {};
  }

  private getAuthName(method: string, db: string) {
    return [this.service.name, method, db].join('.');
  }

  private getPair(name: string) {
    const pair = this.dbMap_.get(name);
    if (!pair)
      throw new UserError(UserErrorCode.ERR_DB_NOT_FOUND, `ERR_DB_NOT_FOUND, db=${name}`);
    return pair;
  }

  private async installData(entity: any, data: any) {
    const result = new entity();
    for (const [key, value] of Object.entries(data)) {
      result[key] = value;
    }

    const errors = await validate(data);
    if (errors.length) {
      throw new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID, property=[${errors.map(e => e.property).join(',')}]`);
    }

    return result;
  }

  private dbMap_: Map<string, IRestfulHandlerCom>;
}


export {RestfulHandler}
