import {Request, Response, Route, RPCHandler, Service} from '@sora-soft/framework';
import {AuthGroupId, GuestGroupId} from '../../app/account/AccountType';
import {AccountWorld} from '../../app/account/AccountWorld';
import {UserErrorCode} from '../../app/ErrorCode';
import {UserError} from '../../app/UserError';
import {AuthRPCHeader} from '../Const';

class AuthRoute<T extends Service = Service> extends Route<T> {
  static auth(authName?: string) {
    return (target: AuthRoute, method: string, descriptor: PropertyDescriptor) => {
      const origin: RPCHandler = descriptor.value;
      descriptor.value = async function (body: any, request: Request, response: Response) {
        const checkAuthName = [this.service.name, authName ? authName : method].join('/');

        const gid: AuthGroupId = request.getHeader(AuthRPCHeader.RPC_AUTH_GID);
        // from other server
        if (!gid) {

        } else {
          if (gid === GuestGroupId)
            throw new UserError(UserErrorCode.ERR_NOT_LOGIN, `ERR_NOT_LOGIN`);

          const allowed = await AccountWorld.hasAuth(gid, checkAuthName);
          if (!allowed) {
            throw new UserError(UserErrorCode.ERR_AUTH_DENY, `ERR_AUTH_DENY, name=${checkAuthName}`);
          }
        }


        return origin.apply(this, [body, request, response]);
      }
      return descriptor;
    };
  }

  constructor(service: T) {
    super(service);
  }
}

export {AuthRoute}
