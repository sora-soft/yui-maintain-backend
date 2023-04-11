import {Connector, Context, ExError, IServiceOptions, ITCPListenerOptions, ListenerEvent, Logger, Node, Route, Service, TCPListener} from '@sora-soft/framework';
import {Pvd} from '../../lib/Provider.js';
import {ServiceName} from './common/ServiceName.js';
import {IWebSocketListenerOptions, WebSocketListener} from '@sora-soft/http-support';
import {GatewayHandler} from '../handler/GatewayHandler.js';
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
    this.avaliableConnector_ = new Map();
    this.connectorRegistedNotify_ = new WeakMap();
  }

  protected async startup(ctx: Context) {
    await this.connectComponents([Com.businessDB, Com.businessRedis, Com.etcd, Com.aliCloud], ctx);
    await this.registerProviders([Pvd.restful, Pvd.auth, Pvd.monitor], ctx);

    await AccountWorld.startup();

    const route = new GatewayHandler(this, {
      [ServiceName.Restful]: Pvd.restful,
      [ServiceName.Auth]: Pvd.auth,
      [ServiceName.Monitor]: Pvd.monitor,
    });
    const websocketListener = new WebSocketListener(this.gatewayOptions_.websocketListener, ForwardRoute.callback(route), this.gatewayOptions_.websocketListener.labels);

    websocketListener.connectionEmitter.on(ListenerEvent.NewConnect, (session, connector) => {
      this.avaliableConnector_.set(session, connector);
    });

    websocketListener.connectionEmitter.on(ListenerEvent.LostConnect, async (session) => {
      await this.unregisterAllNotify(session).catch((err: ExError) => {
        Application.appLog.warn('gateway', {event: 'unregister-notify-error', error: Logger.errorMessage(err)});
      });
      this.avaliableConnector_.delete(session);
    });

    const serverRoute = new GatewayServerHandler(this);
    const serverListener = new TCPListener(this.gatewayOptions_.serverListener, Route.callback(serverRoute), {role: 'server'});

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

  async registerNotify(session: string, name: string) {
    const connector = this.avaliableConnector_.get(session);
    if (!connector) {
      throw new AppError(AppErrorCode.ERR_SESSION_NOT_AVALIABLE, 'ERR_SESSION_NOT_AVALIABLE');
    }
    let pre = this.connectorRegistedNotify_.get(connector);
    if (!pre) {
      pre = new Set();
      this.connectorRegistedNotify_.set(connector, pre);
    }

    pre.add(name);

    await Com.etcd.lease.put(EtcdKey.sessionNotify(session, name)).value(this.id).exec();
  }

  async unregisterNotify(session: string, name: string) {
    const connector = this.avaliableConnector_.get(session);
    if (!connector) {
      return;
    }

    const registed = this.connectorRegistedNotify_.get(connector);
    const deleted = registed?.delete(name);

    if (deleted) {
      await Com.etcd.client.delete().key(EtcdKey.sessionNotify(session, name)).exec();
    }
  }

  async unregisterAllNotify(session: string) {
    const connector = this.avaliableConnector_.get(session);
    if (!connector) {
      return;
    }

    const registed = this.connectorRegistedNotify_.get(connector);
    if (!registed)
      return;

    for (const name of registed) {
      await Com.etcd.client.delete().key(EtcdKey.sessionNotify(session, name)).exec();
    }
    this.connectorRegistedNotify_.delete(connector);
  }

  get avaliableConnector() {
    return this.avaliableConnector_;
  }

  private gatewayOptions_: IHttpGatewayOptions;
  private avaliableConnector_: Map<string, Connector>;
  private connectorRegistedNotify_: WeakMap<Connector, Set<string>>;
}

export {HttpGatewayService};
