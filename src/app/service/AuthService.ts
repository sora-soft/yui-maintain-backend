import {TCPListener} from '@sora-soft/framework';
import {ITCPListenerOptions} from '@sora-soft/framework';
import {Route} from '@sora-soft/framework';
import {IServiceOptions, Node, Service} from '@sora-soft/framework';
import {AssertType, ValidateClass} from 'typescript-is';
import {Com} from '../../lib/Com';
import {AuthHandler} from '../handler/AuthHandler';
import {ServiceName} from './common/ServiceName';

export interface IAuthOptions extends IServiceOptions {
  tcpListener: ITCPListenerOptions;
}

@ValidateClass()
class AuthService extends Service {
  static register() {
    Node.registerService(ServiceName.Auth, (options: IAuthOptions) => {
      return new AuthService(ServiceName.Auth, options);
    });
  }

  constructor(name: string, @AssertType() options: IAuthOptions) {
    super(name, options);
    this.serviceOptions_ = options;
  }

  protected async startup() {
    await this.connectComponent(Com.businessDB);

    const route = new AuthHandler(this);

    const listener = new TCPListener(this.serviceOptions_.tcpListener, Route.callback(route));
    await this.installListener(listener);
  }

  protected async shutdown() {}

  private serviceOptions_: IAuthOptions;
}

export {AuthService}
