import {Context, Discovery, ExError, IWorkerOptions, Logger, Node, Runtime, SingletonWorker} from '@sora-soft/framework';
import {WorkerName} from './common/WorkerName.js';
import {TargetCluster} from '../cluster/TargetCluster.js';
import {Com} from '../../lib/Com.js';
import {TypeGuard} from '@sora-soft/type-guard';
import {Pvd} from '../../lib/Provider.js';
import {Application} from '../Application.js';
import {EtcdComponent, IEtcdComponentOptions} from '@sora-soft/etcd-component';
import {ETCDDiscovery} from '@sora-soft/etcd-discovery';

export interface IMonitorWorkerOptions extends IWorkerOptions {
  targets: {
    etcd: IEtcdComponentOptions;
    scope: string;
  }[];
}

class MonitorWorker extends SingletonWorker {
  static register() {
    Node.registerWorker(WorkerName.Monitor, (options: IMonitorWorkerOptions) => {
      return new MonitorWorker(WorkerName.Monitor, options);
    });
  }

  constructor(name: string, options: IMonitorWorkerOptions) {
    super(name, options);
    TypeGuard.assert<IMonitorWorkerOptions>(options);
    this.monitorOptions_ = options;

    this.targetMap_ = new Map();
  }

  protected async startup(ctx: Context) {
    await this.connectComponents([Com.businessRedis]);
    await this.registerProvider(Pvd.httpGateway);

    for (const target of this.monitorOptions_.targets) {
      const componentName = `${target.scope}-discovery`;
      const component = new EtcdComponent();
      Runtime.registerComponent(componentName, component);
      component.loadOptions(target.etcd);

      await this.connectComponent(component);

      const discovery = this.targetDiscovery_ = new ETCDDiscovery({
        etcdComponentName: componentName,
        prefix: target.scope,
      });
      await discovery.connect(ctx);
      const cluster = new TargetCluster(discovery, target.scope);
      await cluster.start(ctx);
      this.targetMap_.set(target.scope, cluster);
    }
    this.self_ = new TargetCluster(Runtime.discovery, Runtime.scope);
    await this.self_.start();
  }

  protected async shutdown() {
    if (this.targetDiscovery_) {
      await this.targetDiscovery_.disconnect();
    }
    for (const [scope, cluster] of this.targetMap_) {
      await cluster.stop().catch((err: ExError) => {
        Application.appLog.error('worker.monitor', err, {event: 'stop-target-cluster', scope, error: Logger.errorMessage(err)});
      });
    }
    if (this.self_) {
      await this.self_.stop();
    }
  }

  private monitorOptions_: IMonitorWorkerOptions;
  private targetMap_: Map<string, TargetCluster>;
  private targetDiscovery_?: Discovery;
  private self_?: TargetCluster;
}

export {MonitorWorker};

