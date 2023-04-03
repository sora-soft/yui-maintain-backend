import {IServiceOptions, Node, Service, ITCPListenerOptions, Context, TCPListener} from '@sora-soft/framework';
import {ServiceName} from './common/ServiceName.js';
import {Com} from '../../lib/Com.js';
import {MonitorHandler} from '../handler/MonitorHandler.js';
import {AuthRoute} from '../../lib/route/AuthRoute.js';
import {TypeGuard} from '@sora-soft/type-guard';
import {Pvd} from '../../lib/Provider.js';

export interface IMonitorOptions extends IServiceOptions {
  tcpListener: ITCPListenerOptions;
  targetScope: string;
}

class MonitorService extends Service {
  static register() {
    Node.registerService(ServiceName.Monitor, (options: IMonitorOptions) => {
      return new MonitorService(ServiceName.Monitor, options);
    });
  }

  constructor(name: string, options: IMonitorOptions) {
    TypeGuard.assert<IMonitorOptions>(options);
    super(name, options);
    this.monitorOptions_ = options;
  }

  protected async startup(ctx: Context) {
    await this.connectComponents([Com.businessDB, Com.businessRedis, Com.targetEtcd], ctx);
    await this.registerProvider(Pvd.httpGateway);

    const route = new MonitorHandler(this);
    const listener = new TCPListener(this.monitorOptions_.tcpListener, AuthRoute.callback(route));
    await this.installListener(listener, ctx);
  }

  protected async shutdown() {}

  get targetScope() {
    return this.monitorOptions_.targetScope;
  }

  private monitorOptions_: IMonitorOptions;
}

export {MonitorService};
