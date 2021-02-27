import {HttpGatewayService} from '../HttpGatewayService';
import {TestService} from '../TestService';

class ServiceRegister {
  static init() {
    TestService.register();
    HttpGatewayService.register();
  }
}

export {ServiceRegister};
