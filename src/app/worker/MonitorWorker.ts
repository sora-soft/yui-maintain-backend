import {Context, IWorkerOptions, Node, SingletonWorker} from '@sora-soft/framework';
import {WorkerName} from './common/WorkerName.js';
import {TargetCluster} from '../cluster/TargetCluster.js';
import {Com} from '../../lib/Com.js';
import {TypeGuard} from '@sora-soft/type-guard';
import {ETCDDiscovery} from '@sora-soft/etcd-discovery';
import {Pvd} from '../../lib/Provider.js';

export interface IMonitorWorkerOptions extends IWorkerOptions {
  target: {
    etcdComponentName: string;
    scope: string;
  };
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
  }

  protected async startup(ctx: Context) {
    await this.connectComponents([Com.businessRedis, Com.targetEtcd]);
    await this.registerProvider(Pvd.httpGateway);

    const discovery = new ETCDDiscovery({
      etcdComponentName: this.monitorOptions_.target.etcdComponentName,
      prefix: `${this.monitorOptions_.target.scope}`,
    });
    await discovery.connect(ctx);
    this.target_ = new TargetCluster(discovery, this.monitorOptions_.target.scope);
    await this.target_.start(ctx);
  }

  protected async shutdown() {
    if (this.target_) {
      await this.target_.stop();
    }
  }

  private monitorOptions_: IMonitorWorkerOptions;
  private target_: TargetCluster;
}

export {MonitorWorker};

