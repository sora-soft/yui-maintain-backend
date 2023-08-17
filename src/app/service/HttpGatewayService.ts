import {Connector, Context, ExError, IServiceOptions, ITCPListenerOptions, ListenerConnectionEventType, Logger, Node, Route, Service, TCPListener} from '@sora-soft/framework';
import {Pvd} from '../../lib/Provider.js';
import {ServiceName} from './common/ServiceName.js';
import {IWebSocketListenerOptions, WebSocketListener} from '@sora-soft/http-support';
import {ForwardRoute} from '../../lib/route/ForwardRoute.js';
import {Com} from '../../lib/Com.js';
import {AccountWorld} from '../account/AccountWorld.js';
import {Application} from '../Application.js';
import {TraefikWorld} from '../traefik/TraefikWorld.js';
import {TypeGuard} from '@sora-soft/type-guard';
import {GatewayServerHandler} from '../handler/GatewayServerHandler.js';
import {AppError} from '../AppError.js';
import {AppErrorCode} from '../ErrorCode.js';
import {EtcdKey} from '../Keys.js';

export interface IHttpGatewayOptions extends IServiceOptions {
  serverListener: ITCPListenerOptions;
  websocketListener: IWebSocketListenerOptions;
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
    this.availableConnector_ = new Map();
    this.connectorRegisteredNotify_ = new WeakMap();
  }

  protected async startup(ctx: Context) {
    await this.connectComponents([Com.businessDB, Com.businessRedis, Com.etcd, Com.aliCloud], ctx);
    await this.registerProviders([Pvd.restful, Pvd.auth, Pvd.monitor], ctx);

    await ctx.await(AccountWorld.startup());

    const route = new ForwardRoute(this, {
      [ServiceName.Restful]: Pvd.restful,
      [ServiceName.Auth]: Pvd.auth,
      [ServiceName.Monitor]: Pvd.monitor,
    });
    const websocketListener = this.websocketListener_ = new WebSocketListener(this.gatewayOptions_.websocketListener, ForwardRoute.callback(route), this.gatewayOptions_.websocketListener.labels);

    websocketListener.connectionSubject.subscribe(async (event) => {
      switch (event.type) {
        case ListenerConnectionEventType.LostConnection: {
          await this.unregisterAllNotify(event.session).catch((err: ExError) => {
            Application.appLog.warn('gateway', {event: 'unregister-notify-error', error: Logger.errorMessage(err)});
          });
          this.availableConnector_.delete(event.session);
          break;
        }
        case ListenerConnectionEventType.NewConnection: {
          this.availableConnector_.set(event.session, event.connector);
          break;
        }
      }
    });

    const serverRoute = new GatewayServerHandler(this);
    const serverListener = new TCPListener(this.gatewayOptions_.serverListener, Route.callback(serverRoute), {role: 'server'});
    this.registerTraefikListener();

    if (this.gatewayOptions_.traefik) {
      const nameInTraefik = `${this.gatewayOptions_.traefik.name || Application.appName.replace('@', '-')}:${this.name}`;
      TraefikWorld.registerTraefikListener(this.gatewayOptions_.traefik.prefix, 'http', `${nameInTraefik}:websocket`, websocketListener);
    }

    await this.installListener(websocketListener, ctx);
    await this.installListener(serverListener, ctx);
  }

  protected async shutdown() {
    await AccountWorld.shutdown();
  }

  private registerTraefikListener() {
    if (this.gatewayOptions_.traefik) {
      const nameInTraefik = `${this.gatewayOptions_.traefik.name || Application.appName.replace('@', '-')}:${this.name}`;
      if (this.websocketListener_) {
        TraefikWorld.registerTraefikListener(this.gatewayOptions_.traefik.prefix, 'http', `${nameInTraefik}:websocket`, this.websocketListener_);
      }
    }
  }

  async registerNotify(session: string, name: string) {
    const connector = this.availableConnector_.get(session);
    if (!connector) {
      throw new AppError(AppErrorCode.ERR_SESSION_NOT_AVALIABLE, 'ERR_SESSION_NOT_AVALIABLE');
    }
    let pre = this.connectorRegisteredNotify_.get(connector);
    if (!pre) {
      pre = new Set();
      this.connectorRegisteredNotify_.set(connector, pre);
    }

    pre.add(name);

    await Com.etcd.lease.put(EtcdKey.sessionNotify(session, name)).value(this.id).exec();
  }

  async unregisterNotify(session: string, name: string) {
    const connector = this.availableConnector_.get(session);
    if (!connector) {
      return;
    }

    const registed = this.connectorRegisteredNotify_.get(connector);
    const deleted = registed?.delete(name);

    if (deleted) {
      await Com.etcd.client.delete().key(EtcdKey.sessionNotify(session, name)).exec();
    }
  }

  async unregisterAllNotify(session: string) {
    const connector = this.availableConnector_.get(session);
    if (!connector) {
      return;
    }

    const registered = this.connectorRegisteredNotify_.get(connector);
    if (!registered)
      return;

    for (const name of registered) {
      await Com.etcd.client.delete().key(EtcdKey.sessionNotify(session, name)).exec();
    }
    this.connectorRegisteredNotify_.delete(connector);
  }

  get availableConnector() {
    return this.availableConnector_;
  }

  private gatewayOptions_: IHttpGatewayOptions;
  private availableConnector_: Map<string, Connector>;
  private connectorRegisteredNotify_: WeakMap<Connector, Set<string>>;
  private websocketListener_?: WebSocketListener;
}

export {HttpGatewayService};
