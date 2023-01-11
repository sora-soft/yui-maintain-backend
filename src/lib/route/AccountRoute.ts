import {Request, Response, Route, RPCHandler, Service} from '@sora-soft/framework';
import {FindOptionsRelations} from '@sora-soft/database-component';
import {AccountId} from '../../app/account/AccountType';
import {Account} from '../../app/database/Account';
import {UserErrorCode} from '../../app/ErrorCode';
import {UserError} from '../../app/UserError';
import {Com} from '../Com';
import {AuthRPCHeader} from '../Const';
import {NonFunctionProperties} from '../Utility';

interface IAccountOptions {
  relations?: FindOptionsRelations<keyof Pick<NonFunctionProperties<Account>, 'userPass'>>;
}

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

  static account(options?: IAccountOptions) {
    return (target: AccountRoute, method: string, descriptor: PropertyDescriptor) => {
      const origin: RPCHandler = descriptor.value;
      descriptor.value = async function (body: any, request: Request, response: Response) {
        if (request.getHeader(AuthRPCHeader.RPC_INNER)) {
          return origin.apply(this, [body, null, request, response]);
        }

        const accountId: AccountId = request.getHeader(AuthRPCHeader.RPC_ACCOUNT_ID);
        if (!accountId)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, `ERR_NOT_LOGIN`);

        const relations = options?.relations || {};

        const account = await Com.businessDB.manager.findOne(Account, {
          where: {
            id: accountId,
          },
          relations,
        });

        return origin.apply(this, [body, account, request, response]);
      }
      return descriptor;
    };
  }

  constructor(service: T) {
    super(service);
  }
}

export {AccountRoute}
