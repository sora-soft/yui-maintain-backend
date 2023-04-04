import {IListenerMetaData, INodeMetaData, INodeRunData, IServiceMetaData, IWorkerMetaData} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {RedisKey} from '../Keys.js';

class MonitorWorld {
  static async fetchClusterNodeRunData(scope: string) {
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

  static async fetchClusterWorkerMetaData(scope: string) {
    const data = await Com.businessRedis.client.hGetAll(RedisKey.targetClusterWorkerMetaData(scope));
    const result: IWorkerMetaData[] = [];
    for (const [_, str] of Object.entries(data)) {
      result.push(JSON.parse(str) as IWorkerMetaData);
    }

    return result;
  }

  static async fetchClusterServiceMetaData(scope: string) {
    const data = await Com.businessRedis.client.hGetAll(RedisKey.targetClusterServiceMetaData(scope));
    const result: IServiceMetaData[] = [];
    for (const [_, str] of Object.entries(data)) {
      result.push(JSON.parse(str) as IServiceMetaData);
    }

    return result;
  }

  static async fetchClusterListenerMetaData(scope: string) {
    const data = await Com.businessRedis.client.hGetAll(RedisKey.targetClusterListenerMetaData(scope));
    const result: IListenerMetaData[] = [];
    for (const [_, str] of Object.entries(data)) {
      result.push(JSON.parse(str) as IListenerMetaData);
    }

    return result;
  }

  static async fetchClusterData(scope: string) {
    const nodeRunData = await this.fetchClusterNodeRunData(scope);
    const nodeMetaData = await this.fetchClusterNodeMetaData(scope);
    const workerMetaData = await this.fetchClusterWorkerMetaData(scope);
    const serviceMetaData = await this.fetchClusterServiceMetaData(scope);
    const listenerMetaData = await this.fetchClusterListenerMetaData(scope);
    return {
      nodeRunData,
      nodeMetaData,
      workerMetaData,
      serviceMetaData,
      listenerMetaData,
    };
  }
}

export {MonitorWorld};
