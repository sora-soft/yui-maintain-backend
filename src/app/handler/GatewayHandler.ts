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
import {AuthPermission} from '../database/Auth';

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
      const account = await AccountWorld.createAccount({
        ...body,
        gid: UserGroupId,
      });

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

    const permissions = await Com.accountDB.manager.find(AuthPermission, {
      select: ['name', 'permission'],
      where: {
        gid: account.gid,
      }
    });

    Application.appLog.info('gateway', { event: 'account-login', account: { id: account.id, gid: account.gid, email: account.email, username: account.username } });

    return {
      account: {
        username: account.username,
        email: account.email,
      },
      permissions
    };
  }

  @Route.method
  async info(body: void, request: Request<void>) {
    const session = request.getHeader(RPCHeader.RPC_SESSION_HEADER);

    const cache = await AccountWorld.getAccountSession(session);
    if (!cache)
      throw new UserError(UserErrorCode.ERR_NOT_LOGIN, `ERR_NOT_LOGIN`);

    const account = await Com.accountDB.manager.findOne(Account, cache.accountId);
    const permissions = await Com.accountDB.manager.find(AuthPermission, {
      select: ['name', 'permission'],
      where: {
        gid: cache.gid,
      }
    });

    return {
      account: {
        username: account.username,
        email: account.email,
      },
      permissions
    };
  }

  @Route.method
  async logout(body: void, request: Request<void>) {
    const session = request.getHeader(RPCHeader.RPC_SESSION_HEADER);

    await AccountWorld.deleteAccountSession(session);

    return {};
  }
}

export {GatewayHandler};
