import {Hash, Random} from '../../lib/Utility.js';
import {Com} from '../../lib/Com.js';
import {Account, AccountLogin, AccountToken} from '../database/Account.js';
import {AuthGroup, AuthPermission} from '../database/Auth.js';
import {UserErrorCode} from '../ErrorCode.js';
import {RedisKey} from '../Keys.js';
import {UserError} from '../UserError.js';
import {AccountId, AccountLoginType, AuthGroupId, DefaultGroupList, DefaultPermissionList, PermissionResult, RootGroupId} from './AccountType.js';
import {validate} from 'class-validator';
import {Application} from '../Application.js';
import {AccountLock} from './AccountLock.js';
import {ForgetPasswordEmail} from './AccountEmail.js';
import {NodeTime, UnixTime} from '@sora-soft/framework';
import {EntityManager, LessThan, Not, MoreThan} from '@sora-soft/database-component/typeorm';
import {transaction} from '../database/utility/Decorators.js';
import {v4 as uuid} from 'uuid';

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

  static async getAccountSession(session: string): Promise<AccountToken | null> {
    return Com.businessDB.manager.findOneBy(AccountToken, {
      session,
      expireAt: MoreThan(UnixTime.now()),
    });
  }

  @transaction(Com.businessDB)
  static async setAccountSession(session: string, account: Account, expire: number = UnixTime.hour(8), manager?: EntityManager) {
    return manager!.save(new AccountToken({
      session,
      accountId: account.id,
      expireAt: UnixTime.now() + expire,
      gid: account.gid,
    }));
  }

  @transaction(Com.businessDB)
  static async deleteAccountSession(session: string, manager?: EntityManager) {
    return manager!.delete(AccountToken, {session});
  }

  @transaction(Com.businessDB)
  static async deleteAccountSessionByAccountId(accountId: AccountId, manager?: EntityManager) {
    return manager!.delete(AccountToken, {accountId});
  }

  @transaction(Com.businessDB)
  static async deleteAccountSessionByAccountIdExcept(accountId: AccountId, token: string, manager?: EntityManager) {
    return manager!.delete(AccountToken, {
      accountId,
      token: Not(token),
    });
  }

  @transaction(Com.businessDB)
  static async deleteExpiredAccountSession(manager?: EntityManager) {
    return manager!.delete(AccountToken, {
      expireAt: LessThan(UnixTime.now()),
    });
  }

  @transaction(Com.businessDB)
  static async deleteAccountSessionByGid(gid: AuthGroupId, manager?: EntityManager) {
    return manager!.delete(AccountToken, {gid});
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

    return permission.every((p) => { return p.permission === PermissionResult.ALLOW; });
  }

  @transaction(Com.businessDB)
  static async resetAccountPassword(account: Account, password: string, manager?: EntityManager) {
    const salt = Random.randomString(20);
    const hashedPassword = Hash.md5(password + salt);
    await manager!.update(AccountLogin, {id: account.id, type: AccountLoginType.USERNAME}, {
      password: hashedPassword,
      salt,
    });
  }

  static async sendAccountResetPassEmail(login: AccountLogin, code: string) {
    const template = ForgetPasswordEmail(code);
    await Com.aliCloud.pop.sendSingleEmail({
      ToAddress: login.username,
      Subject: template.subject,
      HtmlBody: template.bodyHtml,
    });

    const id = Random.randomString(8);
    await Com.businessRedis.setJSON(RedisKey.resetPasswordCode(id), {accountId: login.id, code}, NodeTime.minute(10));
    return id;
  }

  static async getAccountResetPassCode(id: string) {
    return Com.businessRedis.getJSON<{accountId: AccountId; code: string}>(RedisKey.resetPasswordCode(id));
  }

  static async createAccount(account: Pick<Account, 'avatarUrl' | 'gid' | 'nickname'>, login: Pick<AccountLogin, 'type' | 'username' | 'password'>) {
    return AccountLock.registerLock(login.type, login.username, async () => {
      const loginExisted = await Com.businessDB.manager.count(AccountLogin, {
        where: {
          type: login.type,
          username: login.username,
        },
      });

      if (loginExisted)
        throw new UserError(UserErrorCode.ERR_DUPLICATE_REGISTER, 'ERR_DUPLICATE_REGISTER');

      const salt = Random.randomString(20);
      const accountLogin = new AccountLogin({
        type: login.type,
        username: login.username,
        salt,
        password: Hash.md5(login.password + salt),
      });
      const newAccount = new Account({
        gid: account.gid,
        nickname: account.nickname,
        avatarUrl: account.avatarUrl,
        disabled: false,
        createTime: UnixTime.now(),
      });

      const passErrors = await validate(accountLogin);
      if (passErrors.length) {
        throw new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID, property=[${passErrors.map(e => e.property).join(',')}]`);
      }
      const accountErrors = await validate(newAccount);
      if (accountErrors.length) {
        throw new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID, property=[${accountErrors.map(e => e.property).join(',')}]`);
      }

      const createdAccount = await Com.businessDB.manager.transaction(async (manager) => {
        const savedAcc = await manager.save(newAccount);
        accountLogin.id = savedAcc.id;
        await manager.save(accountLogin);
        return savedAcc;
      });

      Application.appLog.info('account-world', {event: 'create-account', account: {id: createdAccount.id, account, loginType: login.type, username: login.username}});

      return createdAccount;
    });
  }

  static async fetchAccountLogin(type: AccountLoginType, accountId: AccountId) {
    const login = await Com.businessDB.manager.findOne(AccountLogin, {
      where: {
        id: accountId,
        type,
      },
    });

    if (!login)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');

    return login;
  }

  static async accountLogin(accountId: AccountId, ttl: number) {
    const account = await Com.businessDB.manager.findOne(Account, {
      where: {
        id: accountId,
      },
    });

    if (!account)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_NOT_FOUND, 'ERR_ACCOUNT_NOT_FOUND');

    if (account.disabled)
      throw new UserError(UserErrorCode.ERR_ACCOUNT_DISABLED, 'ERR_ACCOUNT_DISABLED');

    const token = uuid();
    const newToken = await AccountWorld.setAccountSession(token, account, ttl);

    const permissions = await Com.businessDB.manager.find(AuthPermission, {
      select: ['name', 'permission'],
      where: {
        gid: account.gid,
      },
    });

    Application.appLog.info('gateway', {event: 'account-login', account: {id: account.id, gid: account.gid}});

    return {
      account: {
        id: account.id,
        nickname: account.nickname,
        avatarUrl: account.avatarUrl,
      },
      permissions,
      authorization: {
        token,
        expireAt: newToken.expireAt,
      },
    };
  }
}

export {AccountWorld};
