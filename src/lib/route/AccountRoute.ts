import {Route} from '@sora-soft/framework';
import {FindOptionsRelations} from '@sora-soft/database-component/typeorm';
import {Account, AccountToken} from '../../app/database/Account.js';
import {UserErrorCode} from '../../app/ErrorCode.js';
import {UserError} from '../../app/UserError.js';
import {Com} from '../Com.js';
import {AuthRPCHeader} from '../Const.js';

interface IAccountOptions {
  relations?: FindOptionsRelations<Pick<Account, 'userPass'>>;
}

class AccountRoute extends Route {
  static account(options?: IAccountOptions) {
    return (target: AccountRoute, method: string) => {
      Route.registerProvider(target, method, Account, async(route, body, request) => {
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
      Route.registerProvider(target, method, AccountToken, async(route, body, request) => {
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
