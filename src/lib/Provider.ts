import {Provider, TCPSender} from '@sora-soft/framework';
import {TestHandler} from '../app/handler/TestHandler';
import {ServiceName} from '../app/service/common/ServiceName';

class Pvd {
  static async initProvider() {
    TCPSender.register();
  }

  static test = new Provider<TestHandler>(ServiceName.Test);
}

export {Pvd}
