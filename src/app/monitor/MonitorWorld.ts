import {INodeMetaData, INodeRunData} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {RedisKey} from '../Keys.js';

class MonitorWorld {
  static async fetchClusterNodeRunningData(scope: string) {
    const data = await Com.businessRedis.client.hGetAll(RedisKey.targetClusterNodeRunData(scope));
    const result: INodeRunData[] = [];
    for (const [_, str] of Object.entries(data)) {
      result.push(JSON.parse(str) as INodeRunData);
    }

    return result;
  }

  static async fetchClusterNodeMetaData(scope: string) {
    const data = await Com.businessRedis.client.hGetAll(RedisKey.targetClusterNodeMetaData(scope));
    const result: INodeMetaData[] = [];
    for (const [_, str] of Object.entries(data)) {
      result.push(JSON.parse(str) as INodeMetaData);
    }

    return result;
  }
}

export {MonitorWorld};
