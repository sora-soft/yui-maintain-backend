import {Com} from '../../lib/Com.js';
import {AccountType} from '../../lib/Enum.js';
import {EtcdKey} from '../Keys.js';

class AccountLock {
  static registerLock<T>(type: AccountType, username: string, email: string, nickname: string, callback: () => Promise<T>): Promise<T> {
    return Com.etcd.lock(EtcdKey.accountRegisterUsernameLock(type, username), async () => {
      return Com.etcd.lock(EtcdKey.accountRegisterEmailLock(type, email), async () => {
        return Com.etcd.lock(EtcdKey.accountRegisterNicknameLock(type, nickname), async () => {
          return callback();
        });
      });
    });
  }
}

export {AccountLock};
