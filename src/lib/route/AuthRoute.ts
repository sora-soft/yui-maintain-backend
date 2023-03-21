import {Route, Service} from '@sora-soft/framework';
import {AuthGroupId, GuestGroupId} from '../../app/account/AccountType.js';
import {AccountWorld} from '../../app/account/AccountWorld.js';
import {UserErrorCode} from '../../app/ErrorCode.js';
import {IRestfulReq} from '../../app/handler/RestfulHandler.js';
import {UserError} from '../../app/UserError.js';
import {AuthRPCHeader} from '../Const.js';

class AuthRoute<T extends Service = Service> extends Route {
  static auth(authName?: string) {
    return (target: AuthRoute, method: string) => {
      Route.registerMiddleware<AuthRoute>(target, method, async (route, body, request) => {
        const checkAuthName = [route.service.name, authName || method].join('/');

        const gid = request.getHeader<AuthGroupId>(AuthRPCHeader.RPC_AUTH_GID);
        if (gid) {
          if (gid === GuestGroupId) {
            throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');
          }
          const allowed = await AccountWorld.hasAuth(gid, checkAuthName);
          if (!allowed) {
            throw new UserError(UserErrorCode.ERR_AUTH_DENY, `ERR_AUTH_DENY, name=${checkAuthName}`);
          }
        } else {
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');
        }
        return true;
      });
    };
  }

  static logined(target: AuthRoute, method: string) {
    Route.registerMiddleware(target, method, async (route, body, request) => {
      const gid = request.getHeader<AuthGroupId>(AuthRPCHeader.RPC_AUTH_GID);
      if (!gid || gid === GuestGroupId) {
        throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');
      }
      return true;
    });
  }

  static restful(authName?: string) {
    return (target: AuthRoute, method: string) => {
      Route.registerMiddleware<AuthRoute>(target, method, async (route, body: IRestfulReq, request) => {
        const db = body.db;
        const checkAuthName = [route.service.name, authName || method, db].join('/');

        const gid = request.getHeader<AuthGroupId>(AuthRPCHeader.RPC_AUTH_GID);
        if (gid) {
          if (gid === GuestGroupId) {
            throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');
          }
          const allowed = await AccountWorld.hasAuth(gid, checkAuthName);
          if (!allowed) {
            throw new UserError(UserErrorCode.ERR_AUTH_DENY, `ERR_AUTH_DENY, name=${checkAuthName}`);
          }
        } else {
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');
        }
        return true;
      });
    };
  }

  constructor(service: T) {
    super();
    this.service_ = service;
  }

  get service() {
    return this.service_;
  }

  private service_: T;
}

export {AuthRoute};
