import {IServiceOptions, ITCPListenerOptions, Node, Route, Service, TCPListener} from '@sora-soft/framework';
import {TestHandler} from '../handler/TestHandler';
import {ServiceName} from './common/ServiceName';

export interface ITestOptions extends IServiceOptions {
  tcpListener: ITCPListenerOptions;
}

class TestService extends Service {
  static register() {
    Node.registerService(ServiceName.Test, (options: ITestOptions) => {
      return new TestService(ServiceName.Test, options);
    });
  }

  constructor(name: string, options: ITestOptions) {
    super(name, options);
    this.serviceConfig_ = options;
  }

  protected async startup() {
    const route = new TestHandler(this);
    const listener = new TCPListener(this.serviceConfig_.tcpListener, Route.callback(route), this.executor);

    await this.installListener(listener);
  }

  protected async shutdown() {}

  private serviceConfig_: ITestOptions;
}

export {TestService}
