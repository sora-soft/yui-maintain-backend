import {AccountType} from '../lib/Enum';
import {AccountId} from './account/AccountType';

export class EtcdKey {
  static accountRegisterUsernameLock(type: AccountType, username: string) {
    return `lock/account-register/${type}/username/${username}`;
  }

  static accountRegisterEmailLock(type: AccountType, email: string) {
    return `lock/account-register/${type}/email/${email}`;
  }

  static accountRegisterNicknameLock(type: AccountType, nickname: string) {
    return `lock/account-register/${type}/nickname/${nickname}`;
  }

  static accountCreateCustomDatabaseLock(accountId: AccountId) {
    return `lock/account-create-custom-database/${accountId}`;
  }

  static traefikConfigServiceUrl(prefix: string, protocol: string, name: string, index: string) {
    return `${prefix}/${protocol}/services/${name}/loadBalancer/servers/${index}/url`;
  }
}

export class RedisKey {
  static accountSession(session: string) {
    return `account-session:${session}`;
  }

  static resetPasswordCode(code: string) {
    return `code:${code}:reset-password-code`;
  }
}
