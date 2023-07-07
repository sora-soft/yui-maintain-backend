import {Route, UnixTime} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {Account, AccountLogin, AccountToken} from '../database/Account.js';
import {UserErrorCode} from '../ErrorCode.js';
import {ValidateClass, AssertType} from '@sora-soft/type-guard';
import {UserError} from '../UserError.js';
import {AccountWorld} from '../account/AccountWorld.js';
import {ForwardRoute} from '../../lib/route/ForwardRoute.js';
import {AccountLoginType, UserGroupId} from '../account/AccountType.js';
import {Hash} from '../../lib/Utility.js';
import {AuthPermission} from '../database/Auth.js';
import {AccountRoute} from '../../lib/route/AccountRoute.js';

export interface IReqRegister {
  type: AccountLoginType;
  username: string;
  password: string;
  nickname?: string;
  avatarUrl?: string;
}

export interface IReqLogin {
  username: string;
  password: string;
  type: AccountLoginType;
  remember: boolean;
}

@ValidateClass()
class GatewayHandler extends ForwardRoute {
  @Route.method
  async register(@AssertType() body: IReqRegister) {
    const account = await AccountWorld.createAccount(
      {
        gid: UserGroupId,
        nickname: body.nickname,
        avatarUrl: body.avatarUrl,
      },
      {
        type: body.type,
        username: body.username,
        password: body.password,
      }
    );

    return {
      id: account.id,
    };
  }

  @Route.method
  async login(@AssertType() body: IReqLogin) {
    const loginInfo = await Com.businessDB.manager.findOne(AccountLogin, {
      where: {
        type: body.type,
        username: body.username,
      },
    });
    if (!loginInfo)
      throw new UserError(UserErrorCode.ERR_USERNAME_NOT_FOUND, 'ERR_USERNAME_NOT_FOUND');

    const password = Hash.md5(body.password + loginInfo.salt);

    if (loginInfo.password !== password)
      throw new UserError(UserErrorCode.ERR_WRONG_PASSWORD, 'ERR_WRONG_PASSWORD');

    return AccountWorld.accountLogin(loginInfo.id, body.remember ? UnixTime.day(1) : UnixTime.hour(8));
  }

  @Route.method
  @AccountRoute.account()
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
        nickname: account.nickname,
        avatarUrl: account.avatarUrl,
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
