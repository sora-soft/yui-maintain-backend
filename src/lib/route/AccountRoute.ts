import {Route} from '@sora-soft/framework';
import {FindOptionsRelations} from '@sora-soft/database-component';
import {Account, AccountToken} from '../../app/database/Account';
import {UserErrorCode} from '../../app/ErrorCode';
import {UserError} from '../../app/UserError';
import {Com} from '../Com';
import {AuthRPCHeader} from '../Const';

interface IAccountOptions {
  relations?: FindOptionsRelations<Pick<Account, 'userPass'>>;
}

class AccountRoute extends Route {
  static account(options?: IAccountOptions) {
    return (target: AccountRoute, method: string) => {
      target.registerProvider(method, Account, async(route, body, request) => {
        const accountId = request.getHeader<number>(AuthRPCHeader.RPC_ACCOUNT_ID);
        if (!accountId)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');

        const relations = options?.relations || {};

        const account = await Com.businessDB.manager.findOne<Account>(Account, {
          where: {
            id: accountId,
          },
          relations,
        });
        if (!account)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');

        return account;
      });
    };
  }

  static token() {
    return (target: AccountRoute, method: string) => {
      target.registerProvider(method, AccountToken, async(route, body, request) => {
        const session = request.getHeader<string>(AuthRPCHeader.RPC_AUTHORIZATION);
        if (!session)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');

        const token = await Com.businessDB.manager.findOne(AccountToken, {
          where: {
            session,
          },
        });
        if (!token)
          throw new UserError(UserErrorCode.ERR_NOT_LOGIN, 'ERR_NOT_LOGIN');

        return token;
      });
    };
  }
}

export {AccountRoute};
