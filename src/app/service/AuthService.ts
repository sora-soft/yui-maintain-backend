import {IServiceOptions, ITCPListenerOptions, Node, Route, Service, TCPListener} from '@sora-soft/framework';
import {AuthHandler} from '../handler/AuthHandler';
import {ServiceName} from './common/ServiceName';

export interface IAuthOptions extends IServiceOptions {
  tcpListener: ITCPListenerOptions;
}

class AuthService extends Service {
  static register() {
    Node.registerService(ServiceName.Auth, (options: IAuthOptions) => {
      return new AuthService(ServiceName.Auth, options);
    });
  }

  constructor(name: string, options: IAuthOptions) {
    super(name, options);
    this.serviceConfig_ = options;
  }

  protected async startup() {
    const route = new AuthHandler(this);
    const listener = new TCPListener(this.serviceConfig_.tcpListener, Route.callback(route), this.executor);

    await this.installListener(listener);
  }

  protected async shutdown() {}

  private serviceConfig_: IAuthOptions;
}

export {AuthService}
