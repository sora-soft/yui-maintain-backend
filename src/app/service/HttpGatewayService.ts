import {Context, IServiceOptions, Node, Service} from '@sora-soft/framework';
import {Pvd} from '../../lib/Provider';
import {ServiceName} from './common/ServiceName';
import Koa = require('koa');
import {HTTPListener, IHTTPListenerOptions, IWebSocketListenerOptions, WebSocketListener} from '@sora-soft/http-support';
import {GatewayHandler} from '../handler/GatewayHandler';
import {ForwardRoute} from '../../lib/route/ForwardRoute';
import {Com} from '../../lib/Com';
import {AccountWorld} from '../account/AccountWorld';
import {Application} from '../Application';
import {TraefikWorld} from '../traefik/TraefikWorld';
import {AssertType, ValidateClass} from 'typescript-is';

export interface IHttpGatewayOptions extends IServiceOptions {
  httpListener: IHTTPListenerOptions;
  websocketListener: IWebSocketListenerOptions;
  skipAuthCheck?: boolean;
  traefik?: {
    prefix: string;
    name: string;
  };
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

  protected async startup(ctx: Context) {
    await this.connectComponents([Com.businessDB, Com.businessRedis, Com.etcd, Com.aliCloud], ctx);
    await this.registerProviders([Pvd.restful, Pvd.auth], ctx);

    await AccountWorld.startup();

    const route = new GatewayHandler(this, {
      [ServiceName.Restful]: Pvd.restful,
      [ServiceName.Auth]: Pvd.auth,
    });
    const koa = new Koa();
    const httpListener = new HTTPListener(this.gatewayOptions_.httpListener, koa, ForwardRoute.callback(route), this.gatewayOptions_.httpListener.labels);
    const websocketListener = new WebSocketListener(this.gatewayOptions_.websocketListener, ForwardRoute.callback(route), this.gatewayOptions_.websocketListener.labels);

    if (this.gatewayOptions_.traefik) {
      const nameInTraefik = `${this.gatewayOptions_.traefik.name || Application.appName.replace('@', '-')}:${this.name}`;
      TraefikWorld.registerTraefikListener(this.gatewayOptions_.traefik.prefix, 'http', `${nameInTraefik}:http`, httpListener);
      TraefikWorld.registerTraefikListener(this.gatewayOptions_.traefik.prefix, 'http', `${nameInTraefik}:websocket`, websocketListener);
    }

    await this.installListener(httpListener, ctx);
    await this.installListener(websocketListener, ctx);
  }

  protected async shutdown() {
    await AccountWorld.shutdown();
  }

  private gatewayOptions_: IHttpGatewayOptions;
}

export {HttpGatewayService};
