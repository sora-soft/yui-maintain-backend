import {NodeTime} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {AccountType} from '../../lib/Enum.js';
import {RedisKey} from '../Keys.js';

class AccountLock {
  static registerLock<T>(type: AccountType, username: string, email: string, nickname: string, callback: () => Promise<T>): Promise<T> {
    const lock = Com.businessRedis.createLock({});
    return new Promise<T>((resolve, reject) => {
      lock.lock(RedisKey.accountRegisterUsernameLock(type, username), NodeTime.second(1), async () => {
        await lock.lock(RedisKey.accountRegisterEmailLock(type, email), NodeTime.second(1), async () => {
          await lock.lock(RedisKey.accountRegisterNicknameLock(type, nickname), NodeTime.second(1), async () => {
            resolve(callback());
          });
        });
      }).catch((err) => {
        reject(err);
      });
    });
  }
}

export {AccountLock};
