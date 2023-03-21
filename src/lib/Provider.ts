import {Provider, TCPConnector} from '@sora-soft/framework';
import {WebSocketConnector} from '@sora-soft/http-support';
import {AuthHandler} from '../app/handler/AuthHandler.js';
import {GatewayHandler} from '../app/handler/GatewayHandler.js';
import {RestfulHandler} from '../app/handler/RestfulHandler.js';
import {ServiceName} from '../app/service/common/ServiceName.js';

class Pvd {
  static registerSenders() {
    TCPConnector.register();
    WebSocketConnector.register();
  }

  static httpGateway = new Provider<GatewayHandler>(ServiceName.HttpGateway);
  static restful = new Provider<RestfulHandler>(ServiceName.Restful);
  static auth = new Provider<AuthHandler>(ServiceName.Auth);
}

export {Pvd};
