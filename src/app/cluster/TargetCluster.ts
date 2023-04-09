import {Discovery, Provider, ProviderManager, TCPConnector, NodeHandler, Context, INodeRunData, RPCSender, ConnectorState, LifeCycleEvent, ExError, Logger, ProviderEvent, Route, DiscoveryNodeEvent, INodeMetaData, IServiceMetaData, IWorkerMetaData, IListenerMetaData, DiscoveryServiceEvent, DiscoveryWorkerEvent, DiscoveryListenerEvent} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {Application} from '../Application.js';
import {RedisKey} from '../Keys.js';
import {ServiceName} from '../service/common/ServiceName.js';
import {NodeNotifyHandler} from './NodeNotifyHandler.js';
import {NotifyWorld} from '../gateway/NotifyWorld.js';
import jsondiffpatch from 'jsondiffpatch';
import {INodeClientNotifyHandler, NotifyUpdateType} from '../handler/NodeClientNotifyHandler.js';

class TargetCluster {
  constructor(discovery: Discovery, scope: string) {
    this.discovery_ = discovery;
    this.scope_ = scope;
    this.startContext_ = null;
    this.stopped_ = false;

    this.nodeRunDataMap_ = new Map();
    this.nodeMetaMap_ = new Map();
    this.senderMap_ = new Map();
    this.serviceMetaMap_ = new Map();
    this.workerMetaMap_ = new Map();
    this.listenerMetaMap_ = new Map();
  }

  async start(ctx?: Context) {
    const context = this.startContext_ = new Context(ctx);

    await Com.businessRedis.client.del(RedisKey.targetClusterNodeRunData(this.scope_));
    await Com.businessRedis.client.del(RedisKey.targetClusterNodeMetaData(this.scope_));
    await Com.businessRedis.client.del(RedisKey.targetClusterWorkerMetaData(this.scope_));
    await Com.businessRedis.client.del(RedisKey.targetClusterServiceMetaData(this.scope_));
    await Com.businessRedis.client.del(RedisKey.targetClusterListenerMetaData(this.scope_));

    const nodeList = await this.discovery_.getNodeList();
    for (const node of nodeList) {
      this.setNodeMetaData(node);
    }
    const serviceList = await this.discovery_.getAllServiceList();
    for (const service of serviceList) {
      this.setServiceMetaData(service);
    }
    const workerList = await this.discovery_.getAllWorkerList();
    for (const worker of workerList) {
      this.setWorkerMetaData(worker);
    }
    const listenerList = await this.discovery_.getAllEndpointList();
    for (const listener of listenerList) {
      this.setListenerMetaData(listener);
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

    this.discovery_.listenerEmitter.on(DiscoveryListenerEvent.ListenerCreated, (info) => {
      this.setListenerMetaData(info);
    });
    this.discovery_.listenerEmitter.on(DiscoveryListenerEvent.ListenerUpdated, (id, info) => {
      this.setListenerMetaData(info);
    });
    this.discovery_.listenerEmitter.on(DiscoveryListenerEvent.ListenerDeleted, (id) => {
      this.deleteListenerMetaData(id);
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
    this.stopped_ = true;
    if (this.startContext_)
      this.startContext_.abort();
    if (this.provider_)
      await this.provider_.shutdown();
    if (this.providerManager_)
      await this.providerManager_.stop();

    this.nodeRunDataMap_.clear();
    this.nodeMetaMap_.clear();
    this.senderMap_.clear();
    this.serviceMetaMap_.clear();
    this.workerMetaMap_.clear();
    this.listenerMetaMap_.clear();

    await Com.businessRedis.client.del(RedisKey.targetClusterNodeRunData(this.scope_));
    await Com.businessRedis.client.del(RedisKey.targetClusterNodeMetaData(this.scope_));
    await Com.businessRedis.client.del(RedisKey.targetClusterWorkerMetaData(this.scope_));
    await Com.businessRedis.client.del(RedisKey.targetClusterServiceMetaData(this.scope_));
    await Com.businessRedis.client.del(RedisKey.targetClusterListenerMetaData(this.scope_));
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
          if (this.provider) {
            const data = await this.provider.rpc(null, sender.targetId).registerRunningDataNotify();
            if (data) {
              this.createNodeRunningData(data);
            }
          }
          break;
      }
    });
  }

  deleteNodeRunningData(id: string) {
    if (this.stopped_)
      return;
    this.nodeRunDataMap_.delete(id);
    Application.appLog.info('target-cluster', {event: 'delete-node', id});
    Com.businessRedis.client.hDel(RedisKey.targetClusterNodeRunData(this.scope_), id).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-remove-cluster-running-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({scope: this.scope_, nodeRundata: {type: NotifyUpdateType.Delete, id}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  createNodeRunningData(data: INodeRunData) {
    if (this.stopped_)
      return;
    this.setNodeRunningData(data);
    Application.appLog.info('target-cluster', {event: 'create-node', id: data.node.id});
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({scope: this.scope_, nodeRundata: {type: NotifyUpdateType.Create, data}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  updateNodeRunningData(id: string, diff: jsondiffpatch.Delta) {
    if (this.stopped_)
      return;
    const pre = this.nodeRunDataMap_.get(id);
    const final = jsondiffpatch.patch(pre || {}, diff) as INodeRunData;
    this.setNodeRunningData(final);
    Application.appLog.info('target-cluster', {event: 'update-node', id});
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({scope: this.scope_, nodeRundata: {type: NotifyUpdateType.Update, id, diff}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  setNodeRunningData(data: INodeRunData) {
    if (this.stopped_)
      return;
    this.nodeRunDataMap_.set(data.node.id, data);
    Com.businessRedis.client.hSet(RedisKey.targetClusterNodeRunData(this.scope_), [data.node.id, JSON.stringify(data)]).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-target-cluster-running-data-error', error: Logger.errorMessage(err)});
    });
  }

  setNodeMetaData(data: INodeMetaData) {
    if (this.stopped_)
      return;
    this.nodeMetaMap_.set(data.id, data);
    Com.businessRedis.client.hSet(RedisKey.targetClusterNodeMetaData(this.scope_), [data.id, JSON.stringify(data)]).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-target-cluster-node-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({scope: this.scope_, node: {id: data.id, data}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  deleteNodeMetaData(id: string) {
    if (this.stopped_)
      return;
    this.nodeMetaMap_.delete(id);
    Com.businessRedis.client.hDel(RedisKey.targetClusterNodeMetaData(this.scope_), id).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'delete-target-cluster-node-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({scope: this.scope_, node: {id}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  setServiceMetaData(data: IServiceMetaData) {
    if (this.stopped_)
      return;
    this.serviceMetaMap_.set(data.id, data);
    Com.businessRedis.client.hSet(RedisKey.targetClusterServiceMetaData(this.scope_), [data.id, JSON.stringify(data)]).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-target-cluster-service-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({scope: this.scope_, service: {id: data.id, data}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  deleteServiceMetaData(id: string) {
    if (this.stopped_)
      return;
    this.serviceMetaMap_.delete(id);
    Com.businessRedis.client.hDel(RedisKey.targetClusterServiceMetaData(this.scope_), id).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'delete-target-cluster-service-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({scope: this.scope_, service: {id}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  setWorkerMetaData(data: IWorkerMetaData) {
    if (this.stopped_)
      return;
    this.workerMetaMap_.set(data.id, data);
    Com.businessRedis.client.hSet(RedisKey.targetClusterWorkerMetaData(this.scope_), [data.id, JSON.stringify(data)]).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-target-cluster-listener-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({scope: this.scope_, worker: {id: data.id, data}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  deleteWorkerMetaData(id: string) {
    if (this.stopped_)
      return;
    this.workerMetaMap_.delete(id);
    Com.businessRedis.client.hDel(RedisKey.targetClusterWorkerMetaData(this.scope_), id).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'delete-target-cluster-worker-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({scope: this.scope_, worker: {id}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  setListenerMetaData(data: IListenerMetaData) {
    if (this.stopped_)
      return;
    this.listenerMetaMap_.set(data.id, data);
    Com.businessRedis.client.hSet(RedisKey.targetClusterListenerMetaData(this.scope_), [data.id, JSON.stringify(data)]).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'update-target-cluster-listener-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({scope: this.scope_, listener: {id: data.id, data}}).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'notify-to-gateway-error', error: Logger.errorMessage(err)});
    });
  }

  deleteListenerMetaData(id: string) {
    if (this.stopped_)
      return;
    this.listenerMetaMap_.delete(id);
    Com.businessRedis.client.hDel(RedisKey.targetClusterListenerMetaData(this.scope_), id).catch((err: ExError) => {
      Application.appLog.error('target-cluster', err, {event: 'delete-target-cluster-listener-meta-data-error', error: Logger.errorMessage(err)});
    });
    NotifyWorld.sendNotifyToGateway<INodeClientNotifyHandler>().notifyClusterUpdate({scope: this.scope_, listener: {id}}).catch((err: ExError) => {
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
  private providerManager_?: ProviderManager;
  private provider_?: Provider<NodeHandler>;
  private nodeRunDataMap_: Map<string, INodeRunData>;
  private nodeMetaMap_: Map<string, INodeMetaData>;
  private serviceMetaMap_: Map<string, IServiceMetaData>;
  private workerMetaMap_: Map<string, IWorkerMetaData>;
  private listenerMetaMap_: Map<string, IListenerMetaData>;
  private senderMap_: Map<string, RPCSender>;
  private stopped_: boolean;

  private scope_: string;
  private startContext_: Context | null;
}

export {TargetCluster};
