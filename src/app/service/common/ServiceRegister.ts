import {HttpGatewayService} from '../HttpGatewayService.js';
import {RestfulService} from '../RestfulService.js';
import {AuthService} from '../AuthService.js';
import {MonitorService} from '../MonitorService.js';

class ServiceRegister {
  static init() {
    HttpGatewayService.register();
    RestfulService.register();
    AuthService.register();
    MonitorService.register();
  }
}

export {ServiceRegister};
