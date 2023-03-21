import {IServiceOptions, Node, Service, ITCPListenerOptions, Context, TCPListener} from '@sora-soft/framework';
import {ServiceName} from './common/ServiceName.js';
import {Com} from '../../lib/Com.js';
import {MonitorHandler} from '../handler/MonitorHandler.js';
import {AuthRoute} from '../../lib/route/AuthRoute.js';
import {TargetCluster} from '../cluster/TargetCluster.js';
import {ETCDDiscovery} from '@sora-soft/etcd-discovery';
import {TypeGuard} from '@sora-soft/type-guard';

export interface IMonitorOptions extends IServiceOptions {
  tcpListener: ITCPListenerOptions;
  target: {
    etcdComponentName: string;
    scope: string;
  };
}

class MonitorService extends Service {
  static register() {
    Node.registerService(ServiceName.Monitor, (options: IMonitorOptions) => {
      return new MonitorService(ServiceName.Monitor, options);
    });
  }

  constructor(name: string, options: IMonitorOptions) {
    TypeGuard.assertType<IMonitorOptions>(options);
    super(name, options);
    this.serviceOptions_ = options;
  }

  protected async startup(ctx: Context) {
    await this.connectComponents([Com.businessDB, Com.businessRedis, Com.targetEtcd], ctx);
    const discovery = new ETCDDiscovery({
      etcdComponentName: this.serviceOptions_.target.etcdComponentName,
      prefix: `/${this.serviceOptions_.target.scope}`,
    });
    await discovery.connect(ctx);
    this.target_ = new TargetCluster(discovery);
    await this.target_.start(ctx);

    const route = new MonitorHandler(this);

    const listener = new TCPListener(this.serviceOptions_.tcpListener, AuthRoute.callback(route));
    await this.installListener(listener, ctx);
  }

  protected async shutdown() {
    await this.target_.stop();
  }

  get target() {
    return this.target_;
  }

  private serviceOptions_: IMonitorOptions;
  private target_: TargetCluster;
}

export {MonitorService};
