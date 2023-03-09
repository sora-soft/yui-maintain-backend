import 'source-map-support/register';
import {Application, IApplicationOptions} from './app/Application';
import {ConfigLoader} from './lib/ConfigLoader';
import path = require('path');
import 'reflect-metadata';
import {ExError, Logger, Runtime} from '@sora-soft/framework';
import {AppError} from './app/AppError';
import {AppErrorCode} from './app/ErrorCode';

export interface IStartupOptions {
  config: string;
  name?: string;
  arguments?: string[];
}

export const container = async (options: IStartupOptions) => {
  const config = await loadConfig(options);
  await Application.startLog(config.debug, config.logger).catch((err: ExError) => {
    // eslint-disable-next-line no-console
    console.log(`${err.name}: ${err.message}`);
    process.exit(1);
  });
  await Application.startContainer(config).catch(async (err: ExError) => {
    Application.appLog.fatal('start', err, {error: Logger.errorMessage(err)});
    await Runtime.shutdown();
    process.exit(1);
  });
};

export const server = async (options: IStartupOptions) => {
  const config = await loadConfig(options);
  await Application.startLog(config.debug, config.logger).catch((err: ExError) => {
    // eslint-disable-next-line no-console
    console.log(`${err.name}: ${err.message}`);
    process.exit(1);
  });
  await Application.startServer(config).catch(async (err: ExError) => {
    Application.appLog.fatal('start', err, {error: Logger.errorMessage(err)});
    await Runtime.shutdown();
    process.exit(1);
  });
};

export const command = async (options: IStartupOptions) => {
  const config = await loadConfig(options);
  await Application.startOnlyAppLog(config.debug, config.logger).catch((err: ExError) => {
    // eslint-disable-next-line no-console
    console.log(`${err.name}: ${err.message}`);
    process.exit(1);
  });

  if (!options.name)
    throw new AppError(AppErrorCode.ERR_COMMAND_NOT_FOUND, 'ERR_COMMAND_NOT_FOUND');

  if (!options.arguments)
    throw new AppError(AppErrorCode.ERR_COMMAND_NOT_FOUND, 'ERR_COMMAND_NOT_FOUND');

  await Application.startCommand(config, options.name, options.arguments).catch(async (err: ExError) => {
    Application.appLog.fatal('run-command', err, {error: Logger.errorMessage(err)});
    await Runtime.shutdown();
    process.exit(1);
  });
  process.exit(0);
};

const loadConfig = async (options: IStartupOptions) => {
  const configLoader = new ConfigLoader<IApplicationOptions>();
  const configPath = options.config;
  if (path.isAbsolute(configPath)) {
    await configLoader.load(options.config);
  } else {
    await configLoader.load(path.resolve(process.cwd(), options.config));
  }
  return configLoader.getConfig();
};
