import {Discovery, Provider, ProviderManager, TCPConnector, NodeHandler, Context, INodeRunData, RPCSender, ConnectorState, LifeCycleEvent, ExError, Logger, ProviderEvent, Route, DiscoveryNodeEvent, INodeMetaData, IServiceMetaData, IWorkerMetaData, IListenerMetaData, DiscoveryServiceEvent, DiscoveryWorkerEvent} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {Application} from '../Application.js';
import {RedisKey} from '../Keys.js';
import {ServiceName} from '../service/common/ServiceName.js';
import {NodeNotifyHandler} from './NodeNotifyHandler.js';
import {NotifyWorld} from '../gateway/NotifyWorld.js';
import jsondiffpath from 'jsondiffpatch';
import {INodeClientNotifyHandler, NotifyUpdateType} from '../handler/NodeClientNotifyHandler.js';

class TargetCluster {
  constructor(discovery: Discovery, scope: string) {
    this.discovery_ = discovery;
    this.scope_ = scope;
  }

  async start(ctx?: Context) {
    const context = this.startContext_ = new Context(ctx);

    this.nodeRunningDataMap_ = new Map();
    this.nodeMetaMap_ = new Map();
    this.senderMap_ = new Map();
    this.serviceMetaMap_ = new Map();
    this.workerMetaMap_ = new Map();
    this.listenerMetaMap_ = new Map();

    await Com.businessRedis.client.del(RedisKey.targetClusterNodeRunData(this.scope_));
    await Com.businessRedis.client.del(RedisKey.targetClusterNodeMetaData(this.scope_));

    const nodeList = await this.discovery_.getNodeList();
    for (const node of nodeList) {
      this.setNodeMetaData(node);
    }

    this.discovery_.nodeEmitter.on(DiscoveryNodeEvent.NodeCreated, (info) => {
      this.setNodeMetaData(info);
    });
    this.discovery_.nodeEmitter.on(DiscoveryNodeEvent.NodeUpdated, (id, info) => {
      this.setNodeMetaData(info);
    });
    this.discovery_.nodeEmitter.on(DiscoveryNodeEvent.NodeDeleted, (id) => {
      this.deleteNodeMetaData(id);
    });

    this.discovery_.serviceEmitter.on(DiscoveryServiceEvent.ServiceCreated, (info) => {
      this.setServiceMetaData(info);
    });
    this.discovery_.serviceEmitter.on(DiscoveryServiceEvent.ServiceUpdated, (id, info) => {
      this.setServiceMetaData(info);
    });
    this.discovery_.serviceEmitter.on(DiscoveryServiceEvent.ServiceDeleted, (id) => {
      this.deleteServiceMetaData(id);
    });

    this.discovery_.workerEmitter.on(DiscoveryWorkerEvent.WorkerCreated, (info) => {
      this.setWorkerMetaData(info);
    });
    this.discovery_.workerEmitter.on(DiscoveryWorkerEvent.WorkerUpdated, (id, info) => {
      this.setWorkerMetaData(info);
    });
    this.discovery_.workerEmitter.on(DiscoveryWorkerEvent.WorkerDeleted, (id) => {
      this.deleteWorkerMetaData(id);
    });

    this.providerManager_ = new ProviderManager(this.discovery_);
    TCPConnector.register(this.providerManager_);
    await this.providerManager_.start(context);

    const notifyHandler = new NodeNotifyHandler(this);
    this.provider_ = new Provider(ServiceName.Node, undefined, this.providerManager_, Route.callback(notifyHandler));
    this.provider_.senderEmitter.on(ProviderEvent.NewSender, async (sender) => {
      this.registerNodeSender(sender);
    });
    this.provider_.senderEmitter.on(ProviderEvent.RemoveSender, async (id) => {
      this.unregisterNodeSender(id);
    });
    await this.provider_.startup(context);

    Application.appLog.success('target-cluster', {event: 'start-success'});
    this.startContext_ = null;
  }

  async stop() {
    if (this.startContext_) {
      this.startContext_.abort();
    }
    await this.provider_.shutdown();
    await this.providerManager_.stop();
    await this.discovery_.disconnect();
    await Com.businessRedis.client.del(RedisKey.targetClusterNodeRunData(this.scope_));
    await Com.businessRedis.client.del(RedisKey.targetClusterNodeMetaData(this.scope_));
  }

  unregisterNodeSender(id: string) {
    const sender = this.senderMap_.get(id);
    if (!sender)
      return;
    this.deleteNodeRunningData(sender.targetId);
  }

  registerNodeSender(sender: RPCSender) {
    this.senderMap_.set(sender.listenerId, sender);
    sender.connector.stateEmitter.on(LifeCycleEvent.StateChangeTo, async (state) => {
      switch(state) {
        case ConnectorState.READY:
          const data = await this.provider.rpc(null, sender.targetId).registerRunningDataNotify();
          this.createNodeRunningData(data);
          break;
      }
    });
  }

  deleteNodeRunningData(id: string) {
    this.nodeRunningDataMap_.delete(id);
    Application.appLog.info('target-cluster', {event: 'delete-node', id});
    Com.businessRedis.client.hDel(RedisKey.targetClusterNodeRunData(this.scope_), id).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-remove-cluster-running-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({nodeRundata: {type: NotifyUpdateType.Delete, id}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  createNodeRunningData(data: INodeRunData) {
    this.setNodeRunningData(data);
    Application.appLog.info('target-cluster', {event: 'create-node', id: data.node.id});
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({nodeRundata: {type: NotifyUpdateType.Create, data}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  updateNodeRunningData(id: string, diff: jsondiffpath.Delta) {
    const pre = this.nodeRunningDataMap_.get(id);
    const final = jsondiffpath.patch(pre || {}, diff) as INodeRunData;
    this.setNodeRunningData(final);
    Application.appLog.info('target-cluster', {event: 'update-node', id});
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({nodeRundata: {type: NotifyUpdateType.Update, id, diff}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  setNodeRunningData(data: INodeRunData) {
    this.nodeRunningDataMap_.set(data.node.id, data);
    Com.businessRedis.client.hSet(RedisKey.targetClusterNodeRunData(this.scope_), [data.node.id, JSON.stringify(data)]).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-target-cluster-running-data-error', error: Logger.errorMessage(err)});
    });
  }

  setNodeMetaData(data: INodeMetaData) {
    this.nodeMetaMap_.set(data.id, data);
    Com.businessRedis.client.hSet(RedisKey.targetClusterNodeMetaData(this.scope_), [data.id, JSON.stringify(data)]).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-target-cluster-node-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({node: {id: data.id, data}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  deleteNodeMetaData(id: string) {
    this.nodeMetaMap_.delete(id);
    Com.businessRedis.client.hDel(RedisKey.targetClusterNodeMetaData(this.scope_), id).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'delete-target-cluster-node-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({node: {id}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  setServiceMetaData(data: IServiceMetaData) {
    this.serviceMetaMap_.set(data.id, data);
    Com.businessRedis.client.hSet(RedisKey.targetClusterServiceMetaData(this.scope_), [data.id, JSON.stringify(data)]).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-target-cluster-service-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({service: {id: data.id, data}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  deleteServiceMetaData(id: string) {
    this.serviceMetaMap_.delete(id);
    Com.businessRedis.client.hDel(RedisKey.targetClusterServiceMetaData(this.scope_), id).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'delete-target-cluster-service-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({service: {id}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  setWorkerMetaData(data: IWorkerMetaData) {
    this.workerMetaMap_.set(data.id, data);
    Com.businessRedis.client.hSet(RedisKey.targetClusterWorkerMetaData(this.scope_), [data.id, JSON.stringify(data)]).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-target-cluster-listener-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({worker: {id: data.id, data}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  deleteWorkerMetaData(id: string) {
    this.workerMetaMap_.delete(id);
    Com.businessRedis.client.hDel(RedisKey.targetClusterWorkerMetaData(this.scope_), id).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'delete-target-cluster-worker-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({worker: {id}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  setListenerMetaData(data: IListenerMetaData) {
    this.listenerMetaMap_.set(data.id, data);
    Com.businessRedis.client.hSet(RedisKey.targetClusterListenerMetaData(this.scope_), [data.id, JSON.stringify(data)]).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-target-cluster-listener-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({listener: {id: data.id, data}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  deleteListenerMetaData(id: string) {
    this.listenerMetaMap_.delete(id);
    Com.businessRedis.client.hDel(RedisKey.targetClusterListenerMetaData(this.scope_), id).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'delete-target-cluster-listener-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({listener: {id}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  get discovery() {
    return this.discovery_;
  }

  get pvdManager() {
    return this.providerManager_;
  }

  get provider() {
    return this.provider_;
  }

  private discovery_: Discovery;
  private providerManager_: ProviderManager;
  private provider_: Provider<NodeHandler>;
  private nodeRunningDataMap_: Map<string, INodeRunData>;
  private nodeMetaMap_: Map<string, INodeMetaData>;
  private serviceMetaMap_: Map<string, IServiceMetaData>;
  private workerMetaMap_: Map<string, IWorkerMetaData>;
  private listenerMetaMap_: Map<string, IListenerMetaData>;

  private senderMap_: Map<string, RPCSender>;
  private scope_: string;
  private startContext_: Context | null;
}

export {TargetCluster};
