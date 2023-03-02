import {Request, Response, Route, RPCHandler, Service} from '@sora-soft/framework';
import {FindOptionsRelations} from '@sora-soft/database-component';
import {AccountId} from '../../app/account/AccountType';
import {Account, AccountToken} from '../../app/database/Account';
import {UserErrorCode} from '../../app/ErrorCode';
import {UserError} from '../../app/UserError';
import {Com} from '../Com';
import {AuthRPCHeader, ForwardRPCHeader} from '../Const';

interface IAccountOptions {
  relations?: FindOptionsRelations<Pick<Account, 'userPass'>>;
}

class AccountRoute extends Route {
  static account(options?: IAccountOptions) {
    return (target: AccountRoute, method: string, descriptor: PropertyDescriptor) => {
      target.registerProvider(method, Account, async(route, body, request, response, connector) => {
        const accountId: AccountId = request.getHeader(AuthRPCHeader.RPC_ACCOUNT_ID);
        if (!accountId)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, `ERR_NOT_LOGIN`);

        const relations = options?.relations || {};

        const account = await Com.businessDB.manager.findOne<Account>(Account, {
          where: {
            id: accountId,
          },
          relations,
        });
        if (!account)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, `ERR_NOT_LOGIN`);

        return account;
      });
    };
  }

  static token() {
    return (target: AccountRoute, method: string) => {
      target.registerProvider(method, AccountToken, async(route, body, request, response, connector) => {
        const session = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_SESSION);
        if (!session)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, `ERR_NOT_LOGIN`);

        const token = await Com.businessDB.manager.findOne(AccountToken, {
          where: {
            session,
          },
        });
        if (!token)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, `ERR_NOT_LOGIN`);

        return token;
      });
    }
  }
}

export {AccountRoute}
