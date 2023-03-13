import {Provider, TCPConnector} from '@sora-soft/framework';
import {WebSocketConnector} from '@sora-soft/http-support';
import {AuthHandler} from '../app/handler/AuthHandler';
import {GatewayHandler} from '../app/handler/GatewayHandler';
import {MonitorHandler} from '../app/handler/MonitorHandler';
import {RestfulHandler} from '../app/handler/RestfulHandler';
import {ServiceName} from '../app/service/common/ServiceName';

class Pvd {
  static registerSenders() {
    TCPConnector.register();
    WebSocketConnector.register();
  }

  static httpGateway = new Provider<GatewayHandler>(ServiceName.HttpGateway);
  static restful = new Provider<RestfulHandler>(ServiceName.Restful);
  static auth = new Provider<AuthHandler>(ServiceName.Auth);
  static monitor = new Provider<MonitorHandler>(ServiceName.Monitor);
}

export {Pvd};
