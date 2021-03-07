import {Request, Route, RPCHeader} from '@sora-soft/framework';
import {Com} from '../../lib/Com';
import {ForwardRoute} from '../../lib/route/ForwardRoute';
import {Account} from '../database/Account';
import {UserErrorCode} from '../ErrorCode';
import {AccountLock} from '../account/AccountLock';
import {AccountType} from '../../lib/Enum';
import {ValidateClass, AssertType} from 'typescript-is';
import {UserError} from '../UserError';
import {AccountWorld} from '../account/AccountWorld';

export interface IRegisterReq {
  username: string;
  password: string;
  email: string;
}

export interface ILoginReq {
  username: string;
  password: string;
}

@ValidateClass()
class GatewayHandler extends ForwardRoute {
  @Route.method
  async register(@AssertType() body: IRegisterReq) {
    return AccountLock.registerLock(AccountType.Admin, body.username, body.email, async () => {
      const exited = await Com.accountDB.manager.findOne(Account, {
        where: [{
          email: body.email,
        }, {
          username: body.username,
        }]
      });
      if (exited) {
        if (exited.username === body.username)
          throw new UserError(UserErrorCode.ERR_DUPLICATE_USERNAME, `ERR_DUPLICATE_USERNAME`);

        if (exited.email === body.email)
          throw new UserError(UserErrorCode.ERR_DUPLICATE_EMAIL, `ERR_DUPLICATE_EMAIL`);
      }

      const newAccount = new Account();
      newAccount.username = body.username;
      newAccount.password = body.password;
      newAccount.email = body.email;

      const account = await Com.accountDB.manager.save(newAccount);
      return {
        id: account.id,
      };
    });
  }

  @Route.method
  async login(@AssertType() body: ILoginReq, request: Request<ILoginReq>) {
    const account = await Com.accountDB.manager.findOne(Account, {
      where: {
        username: body.username,
      },
    });
    if (!account)
      throw new UserError(UserErrorCode.ERR_USERNAME_NOT_FOUND, `ERR_USERNAME_NOT_FOUND`);

    if (account.password !== body.password)
      throw new UserError(UserErrorCode.ERR_WRONG_PASSWORD, `ERR_WRONG_PASSWORD`);

    const session = request.getHeader(RPCHeader.RPC_SESSION_HEADER);

    await AccountWorld.setAccountSession(session, {
      accountId: account.id
    });

    return {};
  }
}

export {GatewayHandler};
