import {Discovery, Provider, ProviderManager, TCPConnector, NodeHandler, Context, Route, INodeRunData, ProviderEvent, RPCSender, ConnectorState, LifeCycleEvent} from '@sora-soft/framework';
import {Application} from '../Application.js';
import {ServiceName} from '../service/common/ServiceName.js';
import {NodeNotifyHandler} from './NodeNotifyHandler.js';

class TargetCluster {
  constructor(discovery: Discovery) {
    this.discovery_ = discovery;
    this.nodeRunningDataMap_ = new Map();
  }

  async start(ctx?: Context) {
    const context = new Context(ctx);

    this.providerManager_ = new ProviderManager(this.discovery_);
    TCPConnector.register(this.providerManager_);
    await this.providerManager_.start(context);

    const notifyHandler = new NodeNotifyHandler(this);
    this.provider_ = new Provider(ServiceName.Node, undefined, this.providerManager_, Route.callback(notifyHandler));
    this.provider_.senderEmitter.on(ProviderEvent.NewSender, async (sender) => {
      this.registerNodeSender(sender);
    });
    await this.provider_.startup(context);

    Application.appLog.success('target-cluster', {event: 'start-success'});
  }

  async stop() {
    await this.provider_.shutdown();
    await this.providerManager_.stop();
    await this.discovery_.disconnect();
  }

  registerNodeSender(sender: RPCSender) {
    sender.connector.stateEmitter.on(LifeCycleEvent.StateChangeTo, async (state) => {
      switch(state) {
        case ConnectorState.READY:
          const data = await this.provider.rpc(null, sender.targetId).fetchRunningData();
          this.updateNodeRunningData(data);

          await this.provider.rpc(null, sender.targetId).registerRunningDataNotify();
          break;
      }
    });
  }

  updateNodeRunningData(data: INodeRunData) {
    this.nodeRunningDataMap_.set(data.node.id, data);
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
}

export {TargetCluster};
