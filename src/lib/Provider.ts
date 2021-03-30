import {Provider, TCPSender} from '@sora-soft/framework';
import {GatewayHandler} from '../app/handler/GatewayHandler';
import {RestfulHandler} from '../app/handler/RestfulHandler';
import {TestHandler} from '../app/handler/TestHandler';
import {ServiceName} from '../app/service/common/ServiceName';

class Pvd {
  static async registerSenders() {
    TCPSender.register();
  }

  static test = new Provider<TestHandler>(ServiceName.Test);
  static httpGateway = new Provider<GatewayHandler>(ServiceName.HttpGateway);
  static restful = new Provider<RestfulHandler>(ServiceName.Restful);
}

export {Pvd}
