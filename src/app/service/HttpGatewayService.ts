import {IServiceOptions, Node, Route, Service, TCPListener} from '@sora-soft/framework';
import {Pvd} from '../../lib/Provider';
import {ServiceName} from './common/ServiceName';
import Koa = require('koa');
import {HTTPListener, IHTTPListenerOptions} from '@sora-soft/http-support';
import {GatewayHandler} from '../handler/GatewayHandler';
import {ForwardRoute} from '../../lib/route/ForwardRoute';
import {Com} from '../../lib/Com';

export interface IHttpGatewayOptions extends IServiceOptions {
  httpListener: IHTTPListenerOptions;
}

class HttpGatewayService extends Service {
  static register() {
    Node.registerService(ServiceName.HttpGatewayService, (options: IHttpGatewayOptions) => {
      return new HttpGatewayService(ServiceName.HttpGatewayService, options);
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

    const route = new GatewayHandler(this);
    const koa = new Koa();
    const listener = new HTTPListener(this.gatewayOptions_.httpListener, koa, ForwardRoute.callback(route), this.executor);

    await this.installListener(listener);
  }

  protected async shutdown() {
    await Pvd.test.shutdown();
    await Com.etcd.stop();
    await Com.accountDB.stop();
    await Com.accountRedis.stop();
  }

  private gatewayOptions_: IHttpGatewayOptions;
}

export {HttpGatewayService}
