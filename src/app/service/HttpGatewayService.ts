import {IServiceOptions, Node, Service} from '@sora-soft/framework';
import {Pvd} from '../../lib/Provider';
import {ServiceName} from './common/ServiceName';
import Koa = require('koa');
import {HTTPListener, IHTTPListenerOptions} from '@sora-soft/http-support';
import {GatewayHandler} from '../handler/GatewayHandler';
import {ForwardRoute} from '../../lib/route/ForwardRoute';
import {Com} from '../../lib/Com';
import {AccountWorld} from '../account/AccountWorld';
import {Application} from '../Application';
import {TraefikWorld} from '../traefik/TraefikWorld';
import {AssertType, ValidateClass} from 'typescript-is';

export interface IHttpGatewayOptions extends IServiceOptions {
  httpListener: IHTTPListenerOptions;
  skipAuthCheck?: boolean;
  traefik?: {
    prefix: string;
    name: string;
  }
}

@ValidateClass()
class HttpGatewayService extends Service {
  static register() {
    Node.registerService(ServiceName.HttpGateway, (options: IHttpGatewayOptions) => {
      return new HttpGatewayService(ServiceName.HttpGateway, options);
    });
  }

  constructor(name: string, @AssertType() options: IHttpGatewayOptions) {
    super(name, options);
    this.gatewayOptions_ = options;
  }

  protected async startup() {
    await this.connectComponents([Com.businessDB, Com.businessRedis, Com.etcd, Com.aliCloud]);
    await this.registerProviders([Pvd.restful, Pvd.auth]);

    await AccountWorld.startup();

    const route = new GatewayHandler(this, {
      [ServiceName.Restful]: Pvd.restful,
      [ServiceName.Auth]: Pvd.auth,
    });
    const koa = new Koa();
    const listener = new HTTPListener(this.gatewayOptions_.httpListener, koa, ForwardRoute.callback(route), this.gatewayOptions_.httpListener.labels);

    if (this.gatewayOptions_.traefik) {
      const nameInTraefik = `${this.gatewayOptions_.traefik.name || Application.appName.replace('@', '-')}:${this.name}`;
      await TraefikWorld.registerTraefikListener(this.gatewayOptions_.traefik.prefix, 'http', nameInTraefik, listener);
    }

    await this.installListener(listener);
  }

  protected async shutdown() {
    await AccountWorld.shutdown();
  }

  private gatewayOptions_: IHttpGatewayOptions;
}

export {HttpGatewayService}
