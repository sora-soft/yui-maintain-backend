import {Provider, TCPSender} from '@sora-soft/framework';
import {WebSocketSender} from '@sora-soft/http-support';
import {AuthHandler} from '../app/handler/AuthHandler';
import {GatewayHandler} from '../app/handler/GatewayHandler';
import {RestfulHandler} from '../app/handler/RestfulHandler';
import {ServiceName} from '../app/service/common/ServiceName';

class Pvd {
  static registerSenders() {
    TCPSender.register();
    WebSocketSender.register();
  }

  static httpGateway = new Provider<GatewayHandler>(ServiceName.HttpGateway);
  static restful = new Provider<RestfulHandler>(ServiceName.Restful);
  static auth = new Provider<AuthHandler>(ServiceName.Auth);
}

export {Pvd}
