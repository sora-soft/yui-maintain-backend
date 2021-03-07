import {ETCDDiscovery, IETCDOptions} from '@sora-soft/etcd-discovery';
import {ConsoleOutput, IComponentOptions, INodeOptions, IServiceOptions, IWorkerOptions, LogLevel, Node, Runtime} from '@sora-soft/framework';
import {AppConst} from './Const';
import {AppLogger} from './AppLogger';
import {Pvd} from '../lib/Provider';
import {ServiceRegister} from './service/common/ServiceRegister';

export interface IApplicationOptions {
  debug: boolean;
  etcd: IETCDOptions;
  node: INodeOptions;
  services: {
    [name: string]: IServiceOptions;
  }
  workers: {
    [name: string]: IWorkerOptions;
  }
  components: {
    [name: string]: IComponentOptions;
  }
}

class Application {
  static get appLog() {
    return this.appLog_;
  }

  private static appLog_: AppLogger;

  static get config() {
    return this.config_;
  }
  private static config_: IApplicationOptions;

  static async start(options: IApplicationOptions) {
    this.config_ = options;

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

    if (options.components) {
      for (const [name, componentConfig] of Object.entries(options.components)) {
        const component = Runtime.getComponent(name);
        if (!component)
          continue;

        component.loadOptions(componentConfig);
      }
    }

    await Pvd.initProvider();

    if (options.services) {
      for (const [name, serviceConfig] of Object.entries(options.services)) {
        const service = Node.serviceFactory(name, serviceConfig);
        Runtime.installService(service);
      }
    }

    if (options.workers) {
      for (const [name, workerConfig] of Object.entries(options.services)) {
        const worker = Node.workerFactory(name, workerConfig);
        Runtime.installWorker(worker);
      }
    }
  }
}

export {Application};
