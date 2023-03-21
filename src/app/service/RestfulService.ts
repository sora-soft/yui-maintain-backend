import {IServiceOptions, ITCPListenerOptions, Node, Route, Service, TCPListener, Context} from '@sora-soft/framework';
import {TypeGuard} from '@sora-soft/type-guard';
import {Com} from '../../lib/Com.js';
import {Account} from '../database/Account.js';
import {AuthGroup, AuthPermission} from '../database/Auth.js';
import {RestfulHandler} from '../handler/RestfulHandler.js';
import {ServiceName} from './common/ServiceName.js';

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
    TypeGuard.assertType<IRestOptions>(options);
    this.serviceConfig_ = options;
  }

  protected async startup(ctx: Context) {
    await this.connectComponent(Com.businessDB, ctx);

    const route = new RestfulHandler(this, [
      {
        name: 'account',
        com: Com.businessDB,
        entity: Account,
        select: ['id', 'nickname', 'email', 'gid', 'disabled'],
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
      },
    ]);
    const listener = new TCPListener(this.serviceConfig_.tcpListener, Route.callback(route));

    await this.installListener(listener, ctx);
  }

  protected async shutdown() {
  }

  private serviceConfig_: IRestOptions;
}

export {RestfulService};
