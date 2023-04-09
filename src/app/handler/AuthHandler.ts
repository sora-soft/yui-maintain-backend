import {Route} from '@sora-soft/framework';
import {AssertType, ValidateClass} from '@sora-soft/type-guard';
import {Com} from '../../lib/Com.js';
import {AccountRoute} from '../../lib/route/AccountRoute.js';
import {AuthRoute} from '../../lib/route/AuthRoute.js';
import {Random, Util} from '../../lib/Utility.js';
import {AccountId, AuthGroupId, PermissionResult} from '../account/AccountType.js';
import {AccountWorld} from '../account/AccountWorld.js';
import {Application} from '../Application.js';
import {Account, AccountToken} from '../database/Account.js';
import {AuthGroup, AuthPermission} from '../database/Auth.js';
import {UserErrorCode} from '../ErrorCode.js';
import {RedisKey} from '../Keys.js';
import {UserError} from '../UserError.js';

export interface IReqUpdatePermission {
  gid: AuthGroupId;
  permissions: {
    name: string;
    permission: PermissionResult;
  }[];
}

export interface IReqUpdateAccount {
  accountId: AccountId;
  gid?: AuthGroupId;
  nickname?: string;
  email?: string;
}

export interface IReqDisableAccount {
  accountId: AccountId;
  disabled: boolean;
}

export interface IReqDeleteAuthGroup {
  gid: AuthGroupId;
}

export interface IReqCreateAccount {
  username: string;
  nickname: string;
  email: string;
  gid: AuthGroupId;
  password: string;
}

export interface IReqResetPassword {
  id: AccountId;
  password: string;
}

export interface IReqRequestForgetPassword {
  email: string;
}

export interface IReqForgetPassword {
  id: string;
  code: string;
  password: string;
}

export interface IReqDeleteAccessKey {
  id: string;
}

export interface IReqFetchAccessKey {
  offset: number;
  limit: number;
}

@ValidateClass()
class AuthHandler extends AuthRoute {
  @Route.method
  @AuthRoute.logined
  async fetchAccountList() {
    const list = await Com.businessDB.manager.find(Account, {
      select: ['id', 'nickname'],
    });

    return {
      list,
    };
  }

  @Route.method
  @AuthRoute.auth()
  async updatePermission(@AssertType() body: IReqUpdatePermission) {
    const list: AuthPermission[] = [];

    const group = await Com.businessDB.manager.findOneBy(AuthGroup, {id: body.gid});

    if (!group)
      throw new UserError(UserErrorCode.ERR_AUTH_GROUP_NOT_FOUND, 'ERR_GROUP_NOT_FOUND');

    for (const p of body.permissions) {
      const authPermission = new AuthPermission();
      authPermission.gid = body.gid;
      authPermission.name = p.name;
      authPermission.permission = p.permission;
      list.push(authPermission);
    }
    await Com.businessDB.manager.transaction(async (manager) => {
      await manager.delete(AuthPermission, {gid: body.gid});
      await manager.save(list);
    });
    return {};
  }

  @Route.method
  @AuthRoute.auth()
  @AccountRoute.account()
  async updateAccount(@AssertType() body: IReqUpdateAccount, account: Account) {
    await Com.businessDB.manager.transaction(async (manager) => {
      if (Util.isMeaningful(body.email)) {
        account.email = body.email;
      }

      if (Util.isMeaningful(body.gid)) {
        account.gid = body.gid;
        await manager.update(AccountToken, {accountId: account.id}, {gid: body.gid});
      }

      if (Util.isMeaningful(body.nickname)) {
        account.nickname = body.nickname;
      }

      await manager.save(account);
    });
    return {};
  }

  @Route.method
  @AuthRoute.auth()
  @AccountRoute.account()
  async disableAccount(@AssertType() body: IReqDisableAccount, account: Account) {
    if (account.id === body.accountId)
      throw new UserError(UserErrorCode.ERR_DISABLE_SELF, 'ERR_DISABLE_SELF');

    await Com.businessDB.manager.transaction(async (manager) => {
      const target = await Com.businessDB.manager.findOneBy(Account, {id: body.accountId});
      if (!target) {
        throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');
      }

      target.disabled = body.disabled;

      if (target.disabled) {
        await manager.delete(AccountToken, {accountId: target.id});
      }

      await manager.save(target);
    });

    return {};
  }

  @Route.method
  @AuthRoute.auth()
  async deleteAuthGroup(@AssertType() body: IReqDeleteAuthGroup) {
    const accounts = await Com.businessDB.manager.find(Account, {
      where: {
        gid: body.gid,
      },
    });

    if (accounts.length)
      throw new UserError(UserErrorCode.ERR_AUTH_GROUP_NOT_EMPTY, 'ERR_AUTH_GROUP_NOT_EMPTY');

    const group = await Com.businessDB.manager.findOne(AuthGroup, {
      where: {
        id: body.gid,
      },
    });

    if (!group)
      throw new UserError(UserErrorCode.ERR_AUTH_GROUP_NOT_FOUND, 'ERR_GROUP_NOT_FOUND');

    if (group.protected)
      throw new UserError(UserErrorCode.ERR_PROTECTED_GROUP, 'ERR_PROTECTED_GROUP');

    await Com.businessDB.manager.delete(AuthGroup, {
      id: body.gid,
    });

    return {};
  }

  @Route.method
  @AuthRoute.auth()
  async createAccount(@AssertType() body: IReqCreateAccount) {
    const group = await Com.businessDB.manager.findOneBy(AuthGroup, {id: body.gid});

    if (!group)
      throw new UserError(UserErrorCode.ERR_AUTH_GROUP_NOT_FOUND, 'ERR_GROUP_NOT_FOUND');

    const account = await AccountWorld.createAccount({
      email: body.email,
      gid: body.gid,
      nickname: body.nickname,
    }, {
      username: body.username,
      password: body.password,
    });

    return {
      id: account.id,
    };
  }

  @Route.method
  @AuthRoute.auth()
  @AccountRoute.token()
  async resetPassword(@AssertType() body: IReqResetPassword, token: AccountToken) {
    const account = await Com.businessDB.manager.findOneBy(Account, {id: body.id});
    if (!account)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');

    await Com.businessDB.manager.transaction(async (manager) => {
      await AccountWorld.resetAccountPassword(account, body.password, manager);
      await AccountWorld.deleteAccountSessionByAccountIdExcept(account.id, token.session, manager);
    });
    Application.appLog.info('account-world', {event: 'reset-password', accountId: account.id, method: 'resetPassword'});

    return {};
  }

  @Route.method
  async requestForgetPassword(@AssertType() body: IReqRequestForgetPassword) {
    const account = await Com.businessDB.manager.findOneBy(Account, {
      email: body.email,
    });

    if (!account)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');

    const code = Random.randomString(4).toUpperCase();
    const id = await AccountWorld.sendAccountResetPassEmail(account, code);

    return {id};
  }

  @Route.method
  async forgetPassword(@AssertType() body: IReqForgetPassword) {
    const info = await AccountWorld.getAccountResetPassCode(body.id);
    if (!info || info.code !== body.code)
      throw new UserError(UserErrorCode.ERR_WRONG_EMAIL_CODE, 'ERR_WRONG_EMAIL_CODE');

    const account = await Com.businessDB.manager.findOneBy(Account, {id: info.accountId});
    if (!account)
      throw new UserError(UserErrorCode.ERR_WRONG_EMAIL_CODE, 'ERR_WRONG_EMAIL_CODE');

    await Com.businessDB.manager.transaction(async (manager) => {
      await AccountWorld.resetAccountPassword(account, body.password, manager);
      await AccountWorld.deleteAccountSessionByAccountId(account.id, manager);
    });

    Application.appLog.info('account-world', {event: 'reset-password', accountId: account.id, method: 'forgetPassword'});

    await Com.businessRedis.client.del(RedisKey.resetPasswordCode(body.id));

    return {};
  }
}

export {AuthHandler};
