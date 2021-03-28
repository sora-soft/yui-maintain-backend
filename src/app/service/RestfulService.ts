import {IServiceOptions, ITCPListenerOptions, Node, Route, Service, TCPListener} from '@sora-soft/framework';
import {Com} from '../../lib/Com';
import {Account} from '../database/Account';
import {AuthGroup, AuthPermission} from '../database/Auth';
import {RestfulHandler} from '../handler/RestfulHandler';
import {ServiceName} from './common/ServiceName';

export interface IRestOptions extends IServiceOptions {
  tcpListener: ITCPListenerOptions;
}

class RestfulService extends Service {
  static register() {
    Node.registerService(ServiceName.Restful, (options: IRestOptions) => {
      return new RestfulService(ServiceName.Restful, options);
    });
  }

  constructor(name: string, options: IRestOptions) {
    super(name, options);
    this.serviceConfig_ = options;
  }

  protected async startup() {
    await Com.accountDB.start();

    const route = new RestfulHandler(this, [
      {
        name: 'account',
        com: Com.accountDB,
        entity: Account,
      },
      {
        name: 'auth-group',
        com: Com.accountDB,
        entity: AuthGroup,
      },
      {
        name: 'auth-permission',
        com: Com.accountDB,
        entity: AuthPermission,
      }
    ]);
    const listener = new TCPListener(this.serviceConfig_.tcpListener, Route.callback(route), this.executor);

    await this.installListener(listener);
  }

  protected async shutdown() {
    await Com.accountDB.stop();
  }

  private serviceConfig_: IRestOptions;
}

export {RestfulService}