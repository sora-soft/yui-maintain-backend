import {IServiceOptions, ITCPListenerOptions, Node, Route, Service, TCPListener} from '@sora-soft/framework';
import {AssertType, ValidateClass} from 'typescript-is';
import {Com} from '../../lib/Com';
import {Account} from '../database/Account';
import {AuthGroup, AuthPermission} from '../database/Auth';
import {RestfulHandler} from '../handler/RestfulHandler';
import {ServiceName} from './common/ServiceName';

export interface IRestOptions extends IServiceOptions {
  tcpListener: ITCPListenerOptions;
}

@ValidateClass()
class RestfulService extends Service {
  static register() {
    Node.registerService(ServiceName.Restful, (options: IRestOptions) => {
      return new RestfulService(ServiceName.Restful, options);
    });
  }

  constructor(name: string, @AssertType() options: IRestOptions) {
    super(name, options);
    this.serviceConfig_ = options;
  }

  protected async startup() {
    await this.connectComponent(Com.businessDB);

    const route = new RestfulHandler(this, [
      {
        name: 'account',
        com: Com.businessDB,
        entity: Account,
        select: ['id', 'username', 'email', 'gid', 'createAt', 'updateAt'],
      },
      {
        name: 'auth-group',
        com: Com.businessDB,
        entity: AuthGroup,
      },
      {
        name: 'auth-permission',
        com: Com.businessDB,
        entity: AuthPermission,
      }
    ]);
    const listener = new TCPListener(this.serviceConfig_.tcpListener, Route.callback(route), this.executor);

    await this.installListener(listener);
  }

  protected async shutdown() {
  }

  private serviceConfig_: IRestOptions;
}

export {RestfulService}
