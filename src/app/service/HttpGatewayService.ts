import {Node, Route, Service, TCPListener} from '@sora-soft/framework';
import {Pvd} from '../../lib/Provider';
import {TestHandler} from '../handler/TestHandler';
import {ServiceName} from './common/ServiceName';
import Koa = require('koa');
import {HTTPListener} from '@sora-soft/http-support';
import {GatewayHandler} from '../handler/GatewayHandler';
import {ForwardRoute} from '../../lib/ForwardRoute';

class HttpGatewayService extends Service {
  static register() {
    Node.registerService(ServiceName.HttpGatewayService, (options) => {
      return new HttpGatewayService(ServiceName.HttpGatewayService, options);
    });
  }

  protected async startup() {
    await Pvd.test.startup();

    const route = new GatewayHandler(this);
    const koa = new Koa();
    const listener = new HTTPListener({
      port: 8003,
      host: '127.0.0.1',
    }, koa, ForwardRoute.callback(route), this.executor);

    await this.installListener(listener);
  }

  protected async shutdown() {
    await Pvd.test.shutdown();
  }
}

export {HttpGatewayService}
