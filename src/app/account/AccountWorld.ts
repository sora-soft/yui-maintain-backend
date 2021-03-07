import {Com} from '../../lib/Com';
import {TimeConst} from '../Const';
import {RedisKey} from '../Keys';
import {IAccountSessionData} from './AccountType';

class AccountWorld {
  static async setAccountSession(session: string, data: IAccountSessionData) {
    await Com.accountRedis.setJSON(RedisKey.accountSession(session), data, 8 * TimeConst.hour);
  }

  static async getAccountSession(session: string) {
    return Com.accountRedis.getJSON(RedisKey.accountSession(session));
  }
}

export {AccountWorld}
