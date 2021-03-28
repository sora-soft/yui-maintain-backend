import {Request, Route, RPCHeader} from '@sora-soft/framework';
import {validate} from 'class-validator';
import {Com} from '../../lib/Com';
import {Account} from '../database/Account';
import {UserErrorCode} from '../ErrorCode';
import {AccountLock} from '../account/AccountLock';
import {AccountType} from '../../lib/Enum';
import {ValidateClass, AssertType} from 'typescript-is';
import {UserError} from '../UserError';
import {AccountWorld} from '../account/AccountWorld';
import {ForwardRoute} from '../../lib/route/ForwardRoute';
import {UserGroupId} from '../account/AccountType';
import {Application} from '../Application';
import {Hash, Random} from '../../lib/Utility';

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
      newAccount.salt = Random.randomString(20);
      newAccount.username = body.username;
      newAccount.password = Hash.md5(body.password + newAccount.salt);
      newAccount.email = body.email;
      newAccount.gid = UserGroupId;

      const errors = await validate(newAccount);
      if (errors.length) {
        throw new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID, property=[${errors.map(e => e.property).join(',')}]`);
      }

      const account = await Com.accountDB.manager.save(newAccount);

      Application.appLog.info('gateway', { event: 'create-account', account: { id: account.id, gid: account.gid, email: account.email, username: account.username } });

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

    const password = Hash.md5(body.password + account.salt);

    if (account.password !== password)
      throw new UserError(UserErrorCode.ERR_WRONG_PASSWORD, `ERR_WRONG_PASSWORD`);

    const session = request.getHeader(RPCHeader.RPC_SESSION_HEADER);

    await AccountWorld.setAccountSession(session, {
      accountId: account.id,
      gid: account.gid,
    });

    Application.appLog.info('gateway', { event: 'account-login', account: { id: account.id, gid: account.gid, email: account.email, username: account.username } });

    return {};
  }

  @Route.method
  async logout(body: void, request: Request<void>) {
    const session = request.getHeader(RPCHeader.RPC_SESSION_HEADER);

    await AccountWorld.deleteAccountSession(session);

    return {};
  }
}

export {GatewayHandler};
