import {HttpGatewayService} from '../HttpGatewayService';
import {RestfulService} from '../RestfulService';
import {TestService} from '../TestService';

class ServiceRegister {
  static init() {
    TestService.register();
    HttpGatewayService.register();
    RestfulService.register();
  }
}

export {ServiceRegister};
