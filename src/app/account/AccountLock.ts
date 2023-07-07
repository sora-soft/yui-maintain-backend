import {NodeTime} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {RedisKey} from '../Keys.js';
import {AccountLoginType} from './AccountType.js';

class AccountLock {
  static async registerLock<T>(type: AccountLoginType, username: string, callback: () => Promise<T>): Promise<T> {
    const redlock = Com.businessRedis.createLock({});
    const lock = await redlock.lock([
      RedisKey.accountRegisterLock(type, username),
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
