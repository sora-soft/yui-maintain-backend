import {Route} from '@sora-soft/framework';
import {AssertType, ValidateClass} from 'typescript-is';
import {Com} from '../../lib/Com';
import {AccountRoute} from '../../lib/route/AccountRoute';
import {AuthRoute} from '../../lib/route/AuthRoute';
import {Random} from '../../lib/Utility';
import {AccountId, AuthGroupId, PermissionResult} from '../account/AccountType';
import {AccountWorld} from '../account/AccountWorld';
import {Account} from '../database/Account';
import {AuthGroup, AuthPermission} from '../database/Auth';
import {UserErrorCode} from '../ErrorCode';
import {RedisKey} from '../Keys';
import {UserError} from '../UserError';

export interface IUpdatePermissionReq {
  gid: AuthGroupId;
  permissions: {
    name: string;
    permission: PermissionResult;
  }[];
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
  @AccountRoute.id()
  async fetchAccountList(body: void) {
    const list = await Com.businessDB.manager.find(Account, {
      select: ['id', 'nickname'],
    });

    return {
      list,
    };
  }

  @Route.method
  @AuthRoute.auth()
  async updatePermission(@AssertType() body: IUpdatePermissionReq) {
    const list: AuthPermission[] = [];

    const group = await Com.businessDB.manager.findOneBy(AuthGroup, {id: body.gid});

    if (!group)
      throw new UserError(UserErrorCode.ERR_GROUP_NOT_FOUND, `ERR_GROUP_NOT_FOUND`);

    if (group.protected)
      throw new UserError(UserErrorCode.ERR_PROTECTED_GROUP, `ERR_PROTECTED_GROUP`);

    for (const p of body.permissions) {
      const authPermission = new AuthPermission();
      authPermission.gid = body.gid;
      authPermission.name = p.name;
      authPermission.permission = p.permission;
      list.push(authPermission);
    }
    await Com.businessDB.manager.save(list);
  }

  @Route.method
  @AuthRoute.auth()
  async createAccount(@AssertType() body: IReqCreateAccount) {
    const group = await Com.businessDB.manager.findOneBy(AuthGroup, {id: body.gid});

    if (!group)
      throw new UserError(UserErrorCode.ERR_GROUP_NOT_FOUND, `ERR_GROUP_NOT_FOUND`);

    if (group.protected)
      throw new UserError(UserErrorCode.ERR_CANT_CREATE_ROOT, `ERR_CANT_CREATE_ROOT`);

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
  async resetPassword(@AssertType() body: IReqResetPassword) {
    const account = await Com.businessDB.manager.findOneBy(Account, {id: body.id});
    if (!account)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, `ERR_ACCOUNT_NOT_FOUND`);

    await AccountWorld.resetAccountPassword(account, body.password);

    return {};
  }

  @Route.method
  async requestForgetPassword(@AssertType() body: IReqRequestForgetPassword) {
    const account = await Com.businessDB.manager.findOneBy(Account, {
      email: body.email,
    });

    if (!account)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, `ERR_ACCOUNT_NOT_FOUND`);

    const code = Random.randomString(4).toUpperCase();
    const id = await AccountWorld.sendAccountResetPassEmail(account, code);

    return {id};
  }

  @Route.method
  async forgetPassword(@AssertType() body: IReqForgetPassword) {
    const info = await AccountWorld.getAccountResetPassCode(body.id);
    if (!info || info.code !== body.code)
      throw new UserError(UserErrorCode.ERR_WRONG_EMAIL_CODE, `ERR_WRONG_EMAIL_CODE`);

    const account = await Com.businessDB.manager.findOneBy(Account, {id: info.accountId});
    if (!account)
      throw new UserError(UserErrorCode.ERR_WRONG_EMAIL_CODE, `ERR_WRONG_EMAIL_CODE`);

    await AccountWorld.resetAccountPassword(account, body.password);
    await Com.businessRedis.client.del(RedisKey.resetPasswordCode(body.id));

    return {};
  }
}

export {AuthHandler};
