import {AccountType} from '../lib/Enum';
import {AccountId} from './account/AccountType';

export class EtcdKey {
  static accountRegisterUsernameLock(type: AccountType, username: string) {
    return `lock/account-register/${type}/username/${username}`;
  }

  static accountRegisterEmailLock(type: AccountType, email: string) {
    return `lock/account-register/${type}/email/${email}`;
  }
}


export class RedisKey {
  static accountSession(session: string) {
    return `account-session:${session}`;
  }
}
