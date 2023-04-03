import {Context, ExError, Logger, NodeTime, TCPListener} from '@sora-soft/framework';
import {ITCPListenerOptions} from '@sora-soft/framework';
import {Route} from '@sora-soft/framework';
import {IServiceOptions, Node, Service} from '@sora-soft/framework';
import {TypeGuard} from '@sora-soft/type-guard';
import {Com} from '../../lib/Com.js';
import {AccountWorld} from '../account/AccountWorld.js';
import {Application} from '../Application.js';
import {AuthHandler} from '../handler/AuthHandler.js';
import {ServiceName} from './common/ServiceName.js';

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
    TypeGuard.assert<IAuthOptions>(options);
    this.authOptions_ = options;
  }

  protected async startup(ctx: Context) {
    await this.connectComponents([Com.businessDB, Com.businessRedis], ctx);

    const route = new AuthHandler(this);

    const listener = new TCPListener(this.authOptions_.tcpListener, Route.callback(route));
    await this.installListener(listener, ctx);

    this.doJobInterval(async () => {
      await AccountWorld.deleteExpiredAccountSession();
    }, NodeTime.minute(5)).catch((err: ExError) => {
      Application.appLog.error('auth', err, {event: 'delete-expired-account-session-error', error: Logger.errorMessage(err)});
    });
    await AccountWorld.deleteExpiredAccountSession();
  }

  protected async shutdown() {}

  private authOptions_: IAuthOptions;
}

export {AuthService};
