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

class AccountRoute extends Route {
  static account(options?: IAccountOptions) {
    return (target: AccountRoute, method: string, descriptor: PropertyDescriptor) => {
      target.registerProvider(method, Account, async(route, body, request, response, connector) => {
        if (request.getHeader(AuthRPCHeader.RPC_INNER)) {
          return null;
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

        return account;
      });
    };
  }
}

export {AccountRoute}
