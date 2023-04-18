import {NodeTime} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {AccountType} from '../../lib/Enum.js';
import {RedisKey} from '../Keys.js';

class AccountLock {
  static async registerLock<T>(type: AccountType, username: string, email: string, nickname: string, callback: () => Promise<T>): Promise<T> {
    const redlock = Com.businessRedis.createLock({});
    const lock = await redlock.lock([
      RedisKey.accountRegisterUsernameLock(type, username),
      RedisKey.accountRegisterEmailLock(type, email),
      RedisKey.accountRegisterNicknameLock(type, nickname),
    ], NodeTime.second(1));
    try {
      const result = await callback();
      return result;
    } catch (err) {
      throw err;
    } finally {
      await lock.unlock();
    }
  }
}

export {AccountLock};
