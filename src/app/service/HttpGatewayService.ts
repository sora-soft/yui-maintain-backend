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

export interface IHttpGatewayOptions extends IServiceOptions {
  httpListener: IHTTPListenerOptions;
  traefik?: {
    prefix: string;
  }
}

class HttpGatewayService extends Service {
  static register() {
    Node.registerService(ServiceName.HttpGateway, (options: IHttpGatewayOptions) => {
      return new HttpGatewayService(ServiceName.HttpGateway, options);
    });
  }

  constructor(name: string, options: IHttpGatewayOptions) {
    super(name, options);
    this.gatewayOptions_ = options;
  }

  protected async startup() {
    await Com.accountRedis.start();
    await Com.accountDB.start();
    await Com.etcd.start();
    await Pvd.test.startup();
    await Pvd.restful.startup();

    await AccountWorld.startup();

    const route = new GatewayHandler(this, {
      [ServiceName.Test]: Pvd.test,
      [ServiceName.Restful]: Pvd.restful,
    });
    const koa = new Koa();
    const listener = new HTTPListener(this.gatewayOptions_.httpListener, koa, ForwardRoute.callback(route), this.executor);

    if (this.gatewayOptions_.traefik) {
      const nameInTraefik = `${Application.appName.replace('@', '-')}:${this.name}`;
      await TraefikWorld.registerTraefikListener(this.gatewayOptions_.traefik.prefix, 'http', nameInTraefik, listener);
    }

    await this.installListener(listener);
  }

  protected async shutdown() {
    await AccountWorld.shutdown();

    await Pvd.restful.shutdown();
    await Pvd.test.shutdown();
    await Com.etcd.stop();
    await Com.accountDB.stop();
    await Com.accountRedis.stop();
  }

  private gatewayOptions_: IHttpGatewayOptions;
}

export {HttpGatewayService}
