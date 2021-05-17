import {Route} from '@sora-soft/framework';
import {AssertType} from 'typescript-is';
import {Com} from '../../lib/Com';
import {AuthGroupId, PermissionResult} from '../account/AccountType';
import {AccountWorld} from '../account/AccountWorld';
import {AuthPermission} from '../database/Auth';

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
    const account = await AccountWorld.createAccount(body);

    return {
      id: account.id,
    };
  }
}

export {AuthHandler};
