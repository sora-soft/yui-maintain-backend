import {Context, ExError, IServiceOptions, Logger, Node, Service} from '@sora-soft/framework';
import {Pvd} from '../../lib/Provider.js';
import {ServiceName} from './common/ServiceName.js';
import Koa from '@sora-soft/http-support/koa';
import {HTTPListener, IHTTPListenerOptions, IWebSocketListenerOptions, WebSocketListener} from '@sora-soft/http-support';
import {GatewayHandler} from '../handler/GatewayHandler.js';
import {ForwardRoute} from '../../lib/route/ForwardRoute.js';
import {Com} from '../../lib/Com.js';
import {AccountWorld} from '../account/AccountWorld.js';
import {Application} from '../Application.js';
import {TraefikWorld} from '../traefik/TraefikWorld.js';
import {TypeGuard} from '@sora-soft/type-guard';
import {EtcdEvent} from '@sora-soft/etcd-component';

export interface IHttpGatewayOptions extends IServiceOptions {
  httpListener?: IHTTPListenerOptions;
  websocketListener?: IWebSocketListenerOptions;
  skipAuthCheck?: boolean;
  traefik?: {
    prefix: string;
    name?: string;
  };
}

class HttpGatewayService extends Service {
  static register() {
    Node.registerService(ServiceName.HttpGateway, (options: IHttpGatewayOptions) => {
      return new HttpGatewayService(ServiceName.HttpGateway, options);
    });
  }

  constructor(name: string, options: IHttpGatewayOptions) {
    super(name, options);
    TypeGuard.assert<IHttpGatewayOptions>(options);
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
    if (this.gatewayOptions_.httpListener) {
      this.httpListener_ = new HTTPListener(this.gatewayOptions_.httpListener, koa, ForwardRoute.callback(route), this.gatewayOptions_.httpListener.labels);
    }
    if (this.gatewayOptions_.websocketListener) {
      this.websocketListener_ = new WebSocketListener(this.gatewayOptions_.websocketListener, ForwardRoute.callback(route), this.gatewayOptions_.websocketListener.labels);
    }

    this.registerTraefikListener();

    Com.etcd.emitter.on(EtcdEvent.LeaseReconnect, () => {
      if (this.gatewayOptions_.traefik) {
        const nameInTraefik = `${this.gatewayOptions_.traefik.name || Application.appName.replace('@', '-')}:${this.name}`;
        if (this.httpListener_) {
          TraefikWorld.updateTraefikListener(this.gatewayOptions_.traefik.prefix, 'http', `${nameInTraefik}:http`, this.httpListener_).catch((err: ExError) => {
            Application.appLog.error(this.logCategory, err, {event: 'update-traefik-listener-error', error: Logger.errorMessage(err)});
          });
        }
        if (this.websocketListener_) {
          TraefikWorld.updateTraefikListener(this.gatewayOptions_.traefik.prefix, 'http', `${nameInTraefik}:websocket`, this.websocketListener_).catch((err: ExError) => {
            Application.appLog.error(this.logCategory, err, {event: 'update-traefik-listener-error', error: Logger.errorMessage(err)});
          });
        }
      }
    });

    if (this.httpListener_) {
      await this.installListener(this.httpListener_, ctx);
    }

    if (this.websocketListener_) {
      await this.installListener(this.websocketListener_, ctx);
    }
  }

  private registerTraefikListener() {
    if (this.gatewayOptions_.traefik) {
      const nameInTraefik = `${this.gatewayOptions_.traefik.name || Application.appName.replace('@', '-')}:${this.name}`;
      if (this.httpListener_) {
        TraefikWorld.registerTraefikListener(this.gatewayOptions_.traefik.prefix, 'http', `${nameInTraefik}:http`, this.httpListener_);
      }
      if (this.websocketListener_) {
        TraefikWorld.registerTraefikListener(this.gatewayOptions_.traefik.prefix, 'http', `${nameInTraefik}:websocket`, this.websocketListener_);
      }
    }
  }

  protected async shutdown() {
    await AccountWorld.shutdown();
  }

  private gatewayOptions_: IHttpGatewayOptions;
  private httpListener_?: HTTPListener;
  private websocketListener_?: WebSocketListener;
}

export {HttpGatewayService};
