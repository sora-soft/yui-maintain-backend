import {Context, ExError, Logger, NodeTime, TCPListener} from '@sora-soft/framework';
import {ITCPListenerOptions} from '@sora-soft/framework';
import {Route} from '@sora-soft/framework';
import {IServiceOptions, Node, Service} from '@sora-soft/framework';
import {AssertType, ValidateClass} from 'typescript-is';
import {Com} from '../../lib/Com';
import {AccountWorld} from '../account/AccountWorld';
import {Application} from '../Application';
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

  protected async startup(ctx: Context) {
    await this.connectComponents([Com.businessDB, Com.businessRedis], ctx);

    const route = new AuthHandler(this);

    const listener = new TCPListener(this.serviceOptions_.tcpListener, Route.callback(route));
    await this.installListener(listener, ctx);

    this.doJobInterval(async () => {
      await AccountWorld.deleteExpiredAccountSession();
    }, NodeTime.minute(5)).catch((err: ExError) => {
      Application.appLog.error('auth', err, {event: 'delete-expired-account-session-error', error: Logger.errorMessage(err)});
    });
    await AccountWorld.deleteExpiredAccountSession();
  }

  protected async shutdown() {}

  private serviceOptions_: IAuthOptions;
}

export {AuthService};
