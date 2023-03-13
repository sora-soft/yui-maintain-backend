import {HttpGatewayService} from '../HttpGatewayService';
import {RestfulService} from '../RestfulService';
import {AuthService} from '../AuthService';
import {MonitorService} from '../MonitorService';

class ServiceRegister {
  static init() {
    HttpGatewayService.register();
    RestfulService.register();
    AuthService.register();
    MonitorService.register();
  }
}

export {ServiceRegister};
