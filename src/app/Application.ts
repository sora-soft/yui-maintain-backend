import {ETCDDiscovery, IETCDOptions} from '@sora-soft/etcd-discovery';
import {ConsoleOutput, INodeOptions, LogLevel, Node, Runtime} from '@sora-soft/framework';
import {AppConst} from './AppConst';
import {AppLogger} from './AppLogger';
import {Pvd} from '../lib/Provider';
import {ServiceRegister} from './service/common/ServiceRegister';
import {HttpGatewayService} from './service/HttpGatewayService';
import {ServiceName} from './service/common/ServiceName';
import {TestService} from './service/TestService';

export interface IApplicationOptions {
  debug: boolean;
  etcd: IETCDOptions;
  node: INodeOptions;
}

class Application {
  static get appLog() {
    return this.appLog_;
  }

  private static appLog_: AppLogger;

  static async start(options: IApplicationOptions) {
    this.appLog_ = new AppLogger();

    const logLevels = [LogLevel.error, LogLevel.fatal, LogLevel.info, LogLevel.success, LogLevel.warn];
    if (options.debug)
      logLevels.push(LogLevel.debug);

    const consoleOutput = new ConsoleOutput({
      levels: logLevels
    });

    Runtime.frameLogger.pipe(consoleOutput);
    Runtime.rpcLogger.pipe(consoleOutput);
    this.appLog_.pipe(consoleOutput);

    await Runtime.loadConfig({scope: AppConst.appName});
    const discovery = new ETCDDiscovery({
      etcd: options.etcd,
      ttl: 10,
      prefix: `/${Runtime.scope}`
    });
    const node = new Node(options.node);
    await Runtime.startup(node, discovery);
    ServiceRegister.init();
    await Pvd.initProvider();

    const httpGatewayService = new HttpGatewayService(ServiceName.HttpGatewayService, {
      labels: {}
    });
    Runtime.installService(httpGatewayService);
    const testService = new TestService(ServiceName.Test, {
      labels: {}
    });
    Runtime.installService(testService);
  }
}

export {Application};
