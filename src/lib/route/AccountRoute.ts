import {Request, Response, Route, RPCHandler, Service} from '@sora-soft/framework';
import {AccountId, AuthGroupId} from '../../app/account/AccountType';
import {AccountWorld} from '../../app/account/AccountWorld';
import {UserErrorCode} from '../../app/ErrorCode';
import {UserError} from '../../app/UserError';
import {AuthRPCHeader} from '../Const';

class AccountRoute<T extends Service = Service> extends Route<T> {
  static id() {
    return (target: AccountRoute, method: string, descriptor: PropertyDescriptor) => {
      const origin: RPCHandler = descriptor.value;
      descriptor.value = async function (body: any, request: Request, response: Response) {
        if (request.getHeader(AuthRPCHeader.RPC_INNER)) {
          return origin.apply(this, [body, null, request, response]);
        }

        const accountId: AccountId = request.getHeader(AuthRPCHeader.RPC_ACCOUNT_ID);
        if (!accountId)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, `ERR_NOT_LOGIN`);

        return origin.apply(this, [body, accountId, request, response]);
      }
      return descriptor;
    };
  }

  constructor(service: T) {
    super(service);
  }
}

export {AccountRoute}
