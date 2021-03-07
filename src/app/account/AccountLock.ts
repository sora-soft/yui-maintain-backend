import {Com} from '../../lib/Com';
import {AccountType} from '../../lib/Enum';
import {EtcdKey} from '../Keys';

class AccountLock {
  static registerLock<T>(type: AccountType, username: string, email: string, callback: () => Promise<T>): Promise<T> {
    return Com.etcd.lock(EtcdKey.accountRegisterUsernameLock(type, username), async () => {
      return Com.etcd.lock(EtcdKey.accountRegisterEmailLock(type, email), async () => {
        return callback();
      });
    });
  }
}

export {AccountLock}
