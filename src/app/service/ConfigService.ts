import {Context, IServiceOptions, Node, Service} from '@sora-soft/framework';
import {ServiceName} from './common/ServiceName.js';
import {TypeGuard} from '@sora-soft/type-guard';
import {Com} from '../../lib/Com.js';
import {ConfigHandler} from '../handler/ConfigHandler.js';
import {HTTPListener, IHTTPListenerOptions} from '@sora-soft/http-support';
import Koa from '@sora-soft/http-support/koa';
import {ConfigRoute} from '../../lib/route/ConfigRoute.js';

export interface IConfigOptions extends IServiceOptions {
  httpListener: IHTTPListenerOptions;
}

class ConfigService extends Service {
  static register() {
    Node.registerService(ServiceName.Config, (options: IConfigOptions) => {
      return new ConfigService(ServiceName.Config, options);
    });
  }

  constructor(name: string, options: IConfigOptions) {
    super(name, options);
    TypeGuard.assert<IConfigOptions>(options);
    this.configOptions_ = options;
  }

  protected async startup(ctx: Context) {
    await this.connectComponents([Com.businessDB, Com.businessRedis], ctx);

    const route = new ConfigHandler();

    const koa = new Koa();
    const listener = new HTTPListener(this.configOptions_.httpListener, koa, ConfigRoute.callback(route), this.configOptions_.httpListener.labels);

    await this.installListener(listener, ctx);
  }

  protected async shutdown() {}

  private configOptions_: IConfigOptions;
}

export {ConfigService};
