import {Node, Route, Service, TCPListener} from '@sora-soft/framework';
import {Pvd} from '../../lib/Provider';
import {TestHandler} from '../handler/TestHandler';
import {ServiceName} from './common/ServiceName';

class TestService extends Service {
  static register() {
    Node.registerService(ServiceName.Test, (options) => {
      return new TestService(ServiceName.Test, options);
    });
  }

  protected async startup() {
    const route = new TestHandler(this);
    const listener = new TCPListener({
      portRange: [8000, 8010],
      host: '127.0.0.1',
    }, Route.callback(route), this.executor);

    await this.installListener(listener);
  }

  protected async shutdown() {}
}

export {TestService}
