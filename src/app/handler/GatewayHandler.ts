import {Route, UnixTime} from '@sora-soft/framework';
import {Com} from '../../lib/Com';
import {Account, AccountPassword, AccountToken} from '../database/Account';
import {UserErrorCode} from '../ErrorCode';
import {ValidateClass, AssertType} from 'typescript-is';
import {UserError} from '../UserError';
import {AccountWorld} from '../account/AccountWorld';
import {ForwardRoute} from '../../lib/route/ForwardRoute';
import {UserGroupId} from '../account/AccountType';
import {Application} from '../Application';
import {Hash} from '../../lib/Utility';
import {AuthPermission} from '../database/Auth';
import {AccountRoute} from '../../lib/route/AccountRoute';
import {v4 as uuid} from 'uuid';

export interface IRegisterReq {
  username: string;
  password: string;
  nickname: string;
  email: string;
}

export interface ILoginReq {
  username: string;
  password: string;
  remember: boolean;
}

export interface IAKLoginReq {
  accessKey: string;
  secretKey: string;
}

@ValidateClass()
class GatewayHandler extends ForwardRoute {
  @Route.method
  async register(@AssertType() body: IRegisterReq) {
    const account = await AccountWorld.createAccount({
      email: body.email,
      nickname: body.nickname,
      gid: UserGroupId,
    }, {
      username: body.username,
      password: body.password,
    });

    return {
      id: account.id,
    };
  }

  @Route.method
  async login(@AssertType() body: ILoginReq) {
    const userPass = await Com.businessDB.manager.findOne(AccountPassword, {
      where: {
        username: body.username,
      },
    });
    if (!userPass)
      throw new UserError(UserErrorCode.ERR_USERNAME_NOT_FOUND, 'ERR_USERNAME_NOT_FOUND');

    const password = Hash.md5(body.password + userPass.salt);

    if (userPass.password !== password)
      throw new UserError(UserErrorCode.ERR_WRONG_PASSWORD, 'ERR_WRONG_PASSWORD');

    const account = await Com.businessDB.manager.findOneBy(Account, {id: userPass.id});

    if (!account)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');

    if (account.disabled)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_DISABLED, 'ERR_ACCOUNT_DISABLED');

    const token = uuid();
    const ttl = body.remember ? UnixTime.day(5) : UnixTime.hour(8);
    const newToken = await AccountWorld.setAccountSession(token, account, ttl);

    const permissions = await Com.businessDB.manager.find(AuthPermission, {
      select: ['name', 'permission'],
      where: {
        gid: account.gid,
      }
    });

    Application.appLog.info('gateway', {event: 'account-login', account: {id: userPass.id, gid: account.gid, email: account.email, username: userPass.username}});

    return {
      account: {
        id: account.id,
        username: userPass.username,
        email: account.email,
        nickname: account.nickname,
      },
      permissions,
      authorization: {
        token,
        expireAt: newToken.expireAt,
      },
    };
  }

  @Route.method
  @AccountRoute.account({
    relations: {userPass: true}
  })
  @AccountRoute.token()
  async info(body: void, account: Account, token: AccountToken) {
    const permissions = await Com.businessDB.manager.find(AuthPermission, {
      select: ['name', 'permission'],
      where: {
        gid: account.gid,
      },
    });

    return {
      account: {
        id: account.id,
        username: account.userPass.username,
        email: account.email,
        nickname: account.nickname,
      },
      permissions,
      authorization: {
        token: token.session,
        expireAt: token.expireAt,
      },
    };
  }

  @Route.method
  @AccountRoute.token()
  async logout(body: void, token: AccountToken) {
    await AccountWorld.deleteAccountSession(token.session);

    return {};
  }
}

export {GatewayHandler};
