import {Hash, Random} from '../../lib/Utility';
import {Com} from '../../lib/Com';
import {TimeConst} from '../Const';
import {Account} from '../database/Account';
import {AuthGroup, AuthPermission} from '../database/Auth';
import {UserErrorCode} from '../ErrorCode';
import {RedisKey} from '../Keys';
import {UserError} from '../UserError';
import {AuthGroupId, DefaultGroupList, DefaultPermissionList, IAccountSessionData, PermissionResult, RootGroupId} from './AccountType';
import {validate} from 'class-validator';
import {Application} from '../Application';

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
      group.protected = data.protected;
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
    if (gid === RootGroupId)
      return;

    const permission = await Com.accountDB.manager.find(AuthPermission, {
      gid,
      name,
    });

    if (!permission.length)
      return false;

    return permission.every((p) => { return p.permission === PermissionResult.ALLOW });
  }

  static async createAccount(account: Partial<Account>) {
    const exited = await Com.accountDB.manager.findOne(Account, {
      where: [{
        email: account.email,
      }, {
        username: account.username,
      }],
    });
    if (exited) {
      if (exited.username === account.username)
        throw new UserError(UserErrorCode.ERR_DUPLICATE_USERNAME, `ERR_DUPLICATE_USERNAME`);

      if (exited.email === account.email)
        throw new UserError(UserErrorCode.ERR_DUPLICATE_EMAIL, `ERR_DUPLICATE_EMAIL`);
    }

    const newAccount = new Account();
    newAccount.salt = Random.randomString(20);
    newAccount.username = account.username;
    newAccount.password = Hash.md5(account.password + newAccount.salt);
    newAccount.email = account.email;
    newAccount.gid = account.gid;

    const errors = await validate(newAccount);
    if (errors.length) {
      throw new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID, property=[${errors.map(e => e.property).join(',')}]`);
    }

    const createdAccount = await Com.accountDB.manager.save(newAccount);

    Application.appLog.info('gateway', { event: 'create-account', account: { id: account.id, gid: account.gid, email: account.email, username: account.username } });

    return createdAccount;
  }
}

export {AccountWorld}
