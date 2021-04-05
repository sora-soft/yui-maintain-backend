import {ETCDDiscovery} from '@sora-soft/etcd-discovery';
import {ConsoleOutput, IComponentOptions, INodeOptions, IServiceOptions, IWorkerOptions, LogLevel, Node, Runtime} from '@sora-soft/framework';
import {AppConst} from './Const';
import {AppLogger} from './AppLogger';
import {Pvd} from '../lib/Provider';
import {ServiceRegister} from './service/common/ServiceRegister';
import {assertType} from 'typescript-is';
import {AppError} from './AppError';
import {AppErrorCode} from './ErrorCode';
import {WorkerRegister} from './worker/common/WorkerRegister';

// tslint:disable-next-line
const pkg = require('../../package.json');

export interface IApplicationOptions {
  debug: boolean;
  discovery: {
    etcdComponentName: string;
  };
  node: INodeOptions;
  services?: {
    [name: string]: IServiceOptions;
  }
  workers?: {
    [name: string]: IWorkerOptions;
  }
  components?: {
    [name: string]: IComponentOptions;
  }
}

class Application {
  static get appName(): string {
    return pkg.name;
  }

  static get appLog() {
    return this.appLog_;
  }

  private static appLog_: AppLogger;

  static get config() {
    return this.config_;
  }
  private static config_: IApplicationOptions;

  // 以容器模式启动
  // 在这种启动模式下，只会进行 Component 设定，不会启动任何 Service / Worker
  // 多用于集群启动
  static async startContainer(options: IApplicationOptions) {
    await this.start(options);
  }

  // 以执行模式启动
  // 在这种启动模式下，只会启动指定的 Worker，在 Worker 执行完 runCommand 方法后自动退出
  // 多用于命令行启动
  static async startCommand(options: IApplicationOptions, name: string, args: string[]) {
    await this.start(options);
    const worker = Node.workerFactory(name, options.workers[name]);
    await Runtime.installWorker(worker);
    const result = await worker.runCommand(args);
    if (result) {
      this.appLog.success('worker', 'Run command success');
    }
    await Runtime.shutdown();
  }

  // 以配置模式启动
  // 在这种启动模式下，会启动配置文件中的所有 Service 与 Worker
  // 多用于调试启动
  static async startServer(options: IApplicationOptions) {
    await this.start(options);

    if (options.services) {
      for (const [name, serviceConfig] of Object.entries(options.services)) {
        const service = Node.serviceFactory(name, serviceConfig);
        Runtime.installService(service);
      }
    }

    if (options.workers) {
      for (const [name, workerConfig] of Object.entries(options.workers)) {
        const worker = Node.workerFactory(name, workerConfig);
        Runtime.installWorker(worker);
      }
    }
  }

  static async startOnlyAppLog(debug: boolean) {
    this.appLog_ = new AppLogger();

    const logLevels = [LogLevel.error, LogLevel.fatal, LogLevel.info, LogLevel.success, LogLevel.warn];
    if (debug)
      logLevels.push(LogLevel.debug);

    const consoleOutput = new ConsoleOutput({
      levels: logLevels
    });

    this.appLog_.pipe(consoleOutput);
  }

  static async startLog(debug: boolean) {
    this.appLog_ = new AppLogger();

    const logLevels = [LogLevel.error, LogLevel.fatal, LogLevel.info, LogLevel.success, LogLevel.warn];
    if (debug)
      logLevels.push(LogLevel.debug);

    const consoleOutput = new ConsoleOutput({
      levels: logLevels
    });

    Runtime.frameLogger.pipe(consoleOutput);
    Runtime.rpcLogger.pipe(consoleOutput);
    this.appLog_.pipe(consoleOutput);
  }

  private static async start(options: IApplicationOptions) {
    this.config_ = options;
    try {
      assertType<IApplicationOptions>(options);
    } catch(err) {
      throw new AppError(AppErrorCode.ERR_LOAD_CONFIG, `ERR_LOAD_CONFIG, message=${err.message}`);
    }

    // 所有需要使用 Component 的组件都需要在 Component 初始化后才能调用
    if (options.components) {
      for (const [name, componentConfig] of Object.entries(options.components)) {
        const component = Runtime.getComponent(name);
        if (!component)
          continue;

        component.loadOptions(componentConfig);
      }
    }

    await Runtime.loadConfig({scope: AppConst.appName});
    const discovery = new ETCDDiscovery({
      etcdComponentName: options.discovery.etcdComponentName,
      ttl: 10,
      prefix: `/${Runtime.scope}`
    });
    const node = new Node(options.node);
    await Runtime.startup(node, discovery);
    this.appLog_.success('application', { event: 'app-start', versions: { runtime: Runtime.version }, processId: process.pid });

    ServiceRegister.init();
    WorkerRegister.init();
    Pvd.registerSenders();
  }
}

export {Application};
