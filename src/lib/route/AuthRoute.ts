import {Request, Response, Route, RPCHandler, Service} from '@sora-soft/framework';
import {AuthGroupId, GuestGroupId} from '../../app/account/AccountType';
import {AccountWorld} from '../../app/account/AccountWorld';
import {UserErrorCode} from '../../app/ErrorCode';
import {UserError} from '../../app/UserError';
import {AuthRPCHeader} from '../Const';

class AuthRoute<T extends Service = Service> extends Route {
  static auth(authName?: string) {
    return (target: AuthRoute, method: string, descriptor: PropertyDescriptor) => {
      target.registerMiddleware(method, async (body, request, response, connector) => {
        const checkAuthName = [target.service.name, authName ? authName : method].join('/');

        const gid: AuthGroupId = request.getHeader(AuthRPCHeader.RPC_AUTH_GID);
        if (gid) {
          if (gid === GuestGroupId)
            throw new UserError(UserErrorCode.ERR_NOT_LOGIN, `ERR_NOT_LOGIN`);

          const allowed = await AccountWorld.hasAuth(gid, checkAuthName);
          if (!allowed) {
            throw new UserError(UserErrorCode.ERR_AUTH_DENY, `ERR_AUTH_DENY, name=${checkAuthName}`);
          }
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

export {AuthRoute}
