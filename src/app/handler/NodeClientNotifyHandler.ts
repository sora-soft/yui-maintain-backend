import {Route, INodeMetaData, INodeRunData, IServiceMetaData, IWorkerMetaData, IListenerMetaData} from '@sora-soft/framework';
import {Delta} from 'jsondiffpatch';

export enum NotifyUpdateType {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
}

export interface INotifyCreateState<T> {
  type: NotifyUpdateType.Create;
  data: T;
}

export interface INotifyUpdateState {
  type: NotifyUpdateType.Update;
  id: string;
  diff: Delta;
}

export interface INotifyNodeState {
  type: NotifyUpdateType.Delete;
  id: string;
}

export type NotifyNodeRunData = INotifyCreateState<INodeRunData> | INotifyUpdateState | INotifyNodeState;
export interface INotifyMetaData<T> {
  id: string;
  data?: T;
}


export interface INotifyClusterUpdate {
  scope: string;
  node?: INotifyMetaData<INodeMetaData>;
  service?: INotifyMetaData<IServiceMetaData>;
  worker?: INotifyMetaData<IWorkerMetaData>;
  listener?: INotifyMetaData<IListenerMetaData>;
  nodeRundata?: NotifyNodeRunData;
}

export declare class INodeClientNotifyHandler extends Route {
  // notifyNodeRunnigData(body: NotifyNodeRunData): Promise<void>;
  // notifyNodeMetaData(body: INotifyNodeMetaData): Promise<void>;
  notifyClusterUpdate(body: INotifyClusterUpdate): Promise<void>;
}
