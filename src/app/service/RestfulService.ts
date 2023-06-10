import {IServiceOptions, ITCPListenerOptions, Node, Route, Service, TCPListener, Context} from '@sora-soft/framework';
import {TypeGuard} from '@sora-soft/type-guard';
import {Com} from '../../lib/Com.js';
import {Account} from '../database/Account.js';
import {AuthGroup, AuthPermission} from '../database/Auth.js';
import {RestfulHandler} from '../handler/RestfulHandler.js';
import {ServiceName} from './common/ServiceName.js';
import {ConfigFile} from '../database/Config.js';

export interface IRestfulOptions extends IServiceOptions {
  tcpListener: ITCPListenerOptions;
}

class RestfulService extends Service {
  static register() {
    Node.registerService(ServiceName.Restful, (options: IRestfulOptions) => {
      return new RestfulService(ServiceName.Restful, options);
    });
  }

  constructor(name: string, options: IRestfulOptions) {
    super(name, options);
    TypeGuard.assert<IRestfulOptions>(options);
    this.restfulConfig_ = options;
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
      {
        name: 'config-file',
        com: Com.businessDB,
        entity: ConfigFile,
      },
    ]);
    const listener = new TCPListener(this.restfulConfig_.tcpListener, Route.callback(route));

    await this.installListener(listener, ctx);
  }

  protected async shutdown() {
  }

  private restfulConfig_: IRestfulOptions;
}

export {RestfulService};
