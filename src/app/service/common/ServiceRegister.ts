import {HttpGatewayService} from '../HttpGatewayService';
import {RestfulService} from '../RestfulService';
import {AuthService} from '../AuthService';

class ServiceRegister {
  static init() {
    HttpGatewayService.register();
    RestfulService.register();
    AuthService.register();
  }
}

export {ServiceRegister};
