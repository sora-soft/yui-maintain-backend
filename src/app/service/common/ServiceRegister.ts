import {HttpGatewayService} from '../HttpGatewayService.js';
import {RestfulService} from '../RestfulService.js';
import {AuthService} from '../AuthService.js';

class ServiceRegister {
  static init() {
    HttpGatewayService.register();
    RestfulService.register();
    AuthService.register();
  }
}

export {ServiceRegister};
