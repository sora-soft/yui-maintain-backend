import {IListenerMetaData, INodeMetaData, INodeRunData, IServiceMetaData, IWorkerMetaData} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {RedisKey} from '../Keys.js';

export interface INodeRunDataWithScope extends INodeRunData {
  scope: string;
}

export interface INodeMetaDataWithScope extends INodeMetaData {
  scope: string;
}

export interface IWorkerMetaDataWithScope extends IWorkerMetaData {
  scope: string;
}

export interface IServiceMetaDataWithScope extends IServiceMetaData {
  scope: string;
}

export interface IListenerMetaDataWithScope extends IListenerMetaData {
  scope: string;
}

class MonitorWorld {
  static async fetchClusterNodeRunData(scopes: string[]) {
    const result: INodeRunDataWithScope[] = [];
    for (const scope of scopes) {
      const data = await Com.businessRedis.client.hGetAll(RedisKey.targetClusterNodeRunData(scope));
      for (const [_, str] of Object.entries(data)) {
        result.push({...JSON.parse(str), scope} as INodeRunDataWithScope);
      }
    }
    return result;
  }

  static async fetchClusterNodeMetaData(scopes: string[]) {
    const result: INodeMetaDataWithScope[] = [];
    for (const scope of scopes) {
      const data = await Com.businessRedis.client.hGetAll(RedisKey.targetClusterNodeMetaData(scope));
      for (const [_, str] of Object.entries(data)) {
        result.push({...JSON.parse(str), scope} as INodeMetaDataWithScope);
      }
    }
    return result;
  }

  static async fetchClusterWorkerMetaData(scopes: string[]) {
    const result: IWorkerMetaDataWithScope[] = [];
    for (const scope of scopes) {
      const data = await Com.businessRedis.client.hGetAll(RedisKey.targetClusterWorkerMetaData(scope));
      for (const [_, str] of Object.entries(data)) {
        result.push({...JSON.parse(str), scope} as IWorkerMetaDataWithScope);
      }
    }
    return result;
  }

  static async fetchClusterServiceMetaData(scopes: string[]) {
    const result: IServiceMetaDataWithScope[] = [];
    for (const scope of scopes) {
      const data = await Com.businessRedis.client.hGetAll(RedisKey.targetClusterServiceMetaData(scope));
      for (const [_, str] of Object.entries(data)) {
        result.push({...JSON.parse(str), scope} as IServiceMetaDataWithScope);
      }
    }
    return result;
  }

  static async fetchClusterListenerMetaData(scopes: string[]) {
    const result: IListenerMetaData[] = [];
    for (const scope of scopes) {
      const data = await Com.businessRedis.client.hGetAll(RedisKey.targetClusterListenerMetaData(scope));
      for (const [_, str] of Object.entries(data)) {
        result.push({...JSON.parse(str), scope} as IListenerMetaData);
      }
    }
    return result;
  }

  static async fetchClusterData(scope: string[]) {
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
