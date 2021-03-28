import {Com} from '../../lib/Com';
import {TimeConst} from '../Const';
import {AuthGroup, AuthPermission} from '../database/Auth';
import {RedisKey} from '../Keys';
import {AuthGroupId, DefaultGroupList, DefaultPermissionList, IAccountSessionData, PermissionResult} from './AccountType';

class AccountWorld {
  static async startup() {
    await this.loadDefaultGroup();
    await this.loadDefaultPermission();
  }

  static async shutdown() {}

  static async loadDefaultGroup() {
    const groups: AuthGroup [] = [];
    for (const data of DefaultGroupList) {
      const group = new AuthGroup();
      group.id = data.id;
      group.name = data.name;
      groups.push(group);
    }
    if (groups.length) {
      await Com.accountDB.manager.save(groups);
    }
  }

  static async loadDefaultPermission() {
    const permissions: AuthPermission[] = [];
    for (const data of DefaultPermissionList) {
      const permission = new AuthPermission();
      permission.gid = data.gid;
      permission.name = data.name;
      permission.permission = data.permission;
      permissions.push(permission);
    }
    if (permissions.length) {
      await Com.accountDB.manager.save(permissions);
    }
  }

  static async setAccountSession(session: string, data: IAccountSessionData) {
    await Com.accountRedis.setJSON(RedisKey.accountSession(session), data, 8 * TimeConst.hour);
  }

  static async getAccountSession(session: string): Promise<IAccountSessionData> {
    return Com.accountRedis.getJSON(RedisKey.accountSession(session));
  }

  static async deleteAccountSession(session: string) {
    return Com.accountRedis.client.del(RedisKey.accountSession(session));
  }

  static async hasAuth(gid: AuthGroupId, name: string) {
    const permission = await Com.accountDB.manager.find(AuthPermission, {
      gid,
      name,
    });

    if (!permission.length)
      return false;

    return permission.every((p) => { return p.permission === PermissionResult.ALLOW });
  }
}

export {AccountWorld}
