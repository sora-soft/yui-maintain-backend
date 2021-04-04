import {AccountType} from '../lib/Enum';

export class EtcdKey {
  static accountRegisterUsernameLock(type: AccountType, username: string) {
    return `lock/account-register/${type}/username/${username}`;
  }

  static accountRegisterEmailLock(type: AccountType, email: string) {
    return `lock/account-register/${type}/email/${email}`;
  }

  static traefikConfigServiceUrl(prefix: string, protocol: string, name: string, index: string) {
    return `${prefix}/${protocol}/services/${name}/loadBalancer/servers/${index}/url`;
  }
}

export class RedisKey {
  static accountSession(session: string) {
    return `account-session:${session}`;
  }
}
