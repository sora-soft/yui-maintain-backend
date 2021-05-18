import {Route} from '@sora-soft/framework';
import {AssertType} from 'typescript-is';
import {Com} from '../../lib/Com';
import {AuthGroupId, PermissionResult, RootGroupId} from '../account/AccountType';
import {AccountWorld} from '../account/AccountWorld';
import {AuthGroup, AuthPermission} from '../database/Auth';
import {UserErrorCode} from '../ErrorCode';
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
  email: string;
  gid: string;
  password: string;
}

class AuthHandler extends Route {
  @Route.method
  async updatePermission(@AssertType() body: IUpdatePermissionReq) {
    const list: AuthPermission[] = [];

    const group = await Com.accountDB.manager.findOne(AuthGroup, body.gid);

    if (group.protected)
      throw new UserError(UserErrorCode.ERR_PROTECTED_GROUP, `ERR_PROTECTED_GROUP`);

    for (const p of body.permissions) {
      const authPermission = new AuthPermission();
      authPermission.gid = body.gid;
      authPermission.name = p.name;
      authPermission.permission = p.permission;
      list.push(authPermission);
    }
    await Com.accountDB.manager.save(list);
  }

  @Route.method
  async createAccount(@AssertType() body: IReqCreateAccount) {
    const group = await Com.accountDB.manager.findOne(AuthGroup, body.gid);
    if (group.protected)
      throw new UserError(UserErrorCode.ERR_CANT_CREATE_ROOT, `ERR_CANT_CREATE_ROOT`);

    const account = await AccountWorld.createAccount(body);

    return {
      id: account.id,
    };
  }
}

export {AuthHandler};
