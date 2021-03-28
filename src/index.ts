import 'source-map-support/register';
import {Application, IApplicationOptions} from './app/Application';
import {ConfigLoader} from './lib/ConfigLoader';
import path = require('path');
import 'reflect-metadata';
import {ExError, Logger, Runtime} from '@sora-soft/framework';

export interface IStartupOptions {
  config: string;
  name?: string;
  arguments?: string[];
}

export async function container(options: IStartupOptions) {
  const config = await loadConfig(options);
  await Application.startLog(config.debug).catch((err: ExError) => {
    // tslint:disable-next-line
    console.log(`${err.name}: ${err.message}`);
    process.exit(1);
  });
  await Application.startContainer(config).catch(async (err: ExError) => {
    Application.appLog.fatal('start', err, { error: Logger.errorMessage(err) });
    await Runtime.shutdown();
    process.exit(1);
  });
}

export async function server(options: IStartupOptions) {
  const config = await loadConfig(options);
  await Application.startLog(config.debug).catch((err: ExError) => {
    // tslint:disable-next-line
    console.log(`${err.name}: ${err.message}`);
    process.exit(1);
  });
  await Application.startServer(config).catch(async (err: ExError) => {
    Application.appLog.fatal('start', err, { error: Logger.errorMessage(err) });
    await Runtime.shutdown();
    process.exit(1);
  });
}

export async function command(options: IStartupOptions) {
  const config = await loadConfig(options);
  await Application.startOnlyAppLog(config.debug).catch((err: ExError) => {
    // tslint:disable-next-line
    console.log(`${err.name}: ${err.message}`);
    process.exit(1);
  });
  await Application.startCommand(config, options.name, options.arguments).catch(async (err: ExError) => {
    Application.appLog.fatal('run-command', err, { error: Logger.errorMessage(err) });
    await Runtime.shutdown();
    process.exit(1);
  });
  process.exit(0);
}

async function loadConfig(options: IStartupOptions) {
  const configLoader = new ConfigLoader<IApplicationOptions>();
  const configPath = options.config;
  if (path.isAbsolute(configPath)) {
    await configLoader.load(options.config);
  } else {
    await configLoader.load(path.resolve(process.cwd(), options.config));
  }
  return configLoader.getConfig();
}
