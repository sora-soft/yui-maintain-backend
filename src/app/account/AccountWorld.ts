import {Hash, NodeTime, Random, UnixTime} from '../../lib/Utility';
import {Com} from '../../lib/Com';
import {Account, AccountPassword} from '../database/Account';
import {AuthGroup, AuthPermission} from '../database/Auth';
import {UserErrorCode} from '../ErrorCode';
import {RedisKey} from '../Keys';
import {UserError} from '../UserError';
import {AccountId, AuthGroupId, DefaultGroupList, DefaultPermissionList, IAccountSessionData, PermissionResult, RootGroupId} from './AccountType';
import {validate} from 'class-validator';
import {Application} from '../Application';
import {AccountType} from '../../lib/Enum';
import {AccountLock} from './AccountLock';
import {ForgetPasswordEmail} from './AccountEmail';

class AccountWorld {
  static async startup() {
    await this.loadDefaultGroup();
    await this.loadDefaultPermission();
  }

  static async shutdown() {}

  static async loadDefaultGroup() {
    const groups: AuthGroup [] = [];
    for (const data of DefaultGroupList) {
      const existed = await Com.businessDB.manager.findOneBy(AuthGroup, {id: data.id});
      if (existed)
        continue;

      const group = new AuthGroup(data);
      group.createTime = UnixTime.now();
      groups.push(group);
    }
    if (groups.length) {
      await Com.businessDB.manager.save(groups);
    }
  }

  static async loadDefaultPermission() {
    const permissions: AuthPermission[] = [];
    for (const data of DefaultPermissionList) {
      const permission = new AuthPermission(data);
      permissions.push(permission);
    }
    if (permissions.length) {
      await Com.businessDB.manager.save(permissions);
    }
  }

  static async setAccountSession(session: string, data: IAccountSessionData, expire: number = NodeTime.hour(8)) {
    await Com.businessRedis.setJSON(RedisKey.accountSession(session), data, expire);
  }

  static async getAccountSession(session: string): Promise<IAccountSessionData> {
    return Com.businessRedis.getJSON(RedisKey.accountSession(session));
  }

  static async deleteAccountSession(session: string) {
    return Com.businessRedis.client.del(RedisKey.accountSession(session));
  }

  static async hasAuth(gid: AuthGroupId, name: string) {
    if (gid === RootGroupId)
      return true;

    const permission = await Com.businessDB.manager.find(AuthPermission, {
      where: {
        gid,
        name,
      },
    });

    if (!permission.length)
      return false;

    return permission.every((p) => { return p.permission === PermissionResult.ALLOW });
  }

  static async resetAccountPassword(account: Partial<Account>, password: string) {
    const salt = Random.randomString(20);
    const hashedPassword = Hash.md5(password + salt);
    await Com.businessDB.manager.update(AccountPassword, account.id, {
      password: hashedPassword,
      salt,
    });

    Application.appLog.info('account-world', { event: 'reset-password', accountId: account.id });
  }

  static async sendAccountResetPassEmail(account: Account, code: string) {
    const template = ForgetPasswordEmail(code);
    await Com.aliCloud.pop.sendSingleEmail({
      ToAddress: account.email,
      Subject: template.subject,
      HtmlBody: template.bodyHtml,
    });

    const id = Random.randomString(8);
    await Com.businessRedis.setJSON(RedisKey.resetPasswordCode(id), {accountId: account.id, code}, NodeTime.minute(10));
    return id;
  }

  static async getAccountResetPassCode(id: string): Promise<{accountId: AccountId, code: string}> {
    return Com.businessRedis.getJSON(RedisKey.resetPasswordCode(id));
  }

  static async createAccount(account: Pick<Account, 'email' | 'nickname' | 'gid'>, password: Pick<AccountPassword, 'username' | 'password'>) {
    return AccountLock.registerLock(AccountType.Admin, password.username, account.email, account.nickname, async () => {
      const emailExisted = await Com.businessDB.manager.count(Account, {
        where: [{
          email: account.email,
        }],
      });
      const usernameExisted = await Com.businessDB.manager.count(AccountPassword, {
        where: {
          username: password.username,
        }
      });
      const nicknameExisted = await Com.businessDB.manager.count(Account, {
        where: {
          nickname: account.nickname
        }
      });

      if (usernameExisted)
        throw new UserError(UserErrorCode.ERR_DUPLICATE_USERNAME, `ERR_DUPLICATE_USERNAME`);

      if (emailExisted)
        throw new UserError(UserErrorCode.ERR_DUPLICATE_EMAIL, `ERR_DUPLICATE_EMAIL`);

      if (nicknameExisted)
        throw new UserError(UserErrorCode.ERR_DUPLICATE_NICKNAME, `ERR_DUPLICATE_NICKNAME`);

      const newAccount = new Account({
        ...account,
        createTime: UnixTime.now(),
      });
      const salt = Random.randomString(20);
      const accountPassword = new AccountPassword({
        username: password.username,
        salt,
        password: Hash.md5(password.password + salt),
      });

      const passErrors = await validate(accountPassword);
      if (passErrors.length) {
        throw new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID, property=[${passErrors.map(e => e.property).join(',')}]`);
      }
      const accountErrors = await validate(newAccount);
      if (accountErrors.length) {
        throw new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID, property=[${accountErrors.map(e => e.property).join(',')}]`);
      }

      const createdAccount = await Com.businessDB.manager.transaction(async (manager) => {
        const savedAcc = await manager.save(newAccount);
        accountPassword.id = savedAcc.id;
        await manager.save(accountPassword);
        return savedAcc;
      });

      Application.appLog.info('account-world', { event: 'create-account', account: { id: createdAccount.id, gid: account.gid, email: account.email, nickname: account.nickname, username: password.username } });

      return createdAccount;
    });
  }
}

export {AccountWorld}
