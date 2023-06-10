import {LabelFilter, Provider, TCPConnector, FilterOperator} from '@sora-soft/framework';
import {WebSocketConnector} from '@sora-soft/http-support';
import {AuthHandler} from '../app/handler/AuthHandler.js';
import {GatewayServerHandler} from '../app/handler/GatewayServerHandler.js';
import {MonitorHandler} from '../app/handler/MonitorHandler.js';
import {RestfulHandler} from '../app/handler/RestfulHandler.js';
import {ConfigHandler} from '../app/handler/ConfigHandler.js';
import {ServiceName} from '../app/service/common/ServiceName.js';

class Pvd {
  static registerSenders() {
    TCPConnector.register();
    WebSocketConnector.register();
  }

  static httpGateway = new Provider<GatewayServerHandler>(ServiceName.HttpGateway, new LabelFilter([{label: 'role', operator: FilterOperator.INCLUDE, values: ['server']}]));
  static restful = new Provider<RestfulHandler>(ServiceName.Restful);
  static auth = new Provider<AuthHandler>(ServiceName.Auth);
  static monitor = new Provider<MonitorHandler>(ServiceName.Monitor);
  static config = new Provider<ConfigHandler>(ServiceName.Config);
}

export {Pvd};
