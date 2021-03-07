import 'source-map-support/register';
import {Application, IApplicationOptions} from './app/Application';
import {ConfigLoader} from './lib/ConfigLoader';
import path = require('path');
import 'reflect-metadata';

export interface IStartupOptions {
  config: string;
}

export async function main(options: IStartupOptions) {
  const configLoader = new ConfigLoader<IApplicationOptions>();
  const configPath = options.config;
  if (path.isAbsolute(configPath)) {
    await configLoader.load(options.config);
  } else {
    await configLoader.load(path.resolve(process.cwd(), options.config));
  }
  await Application.start(configLoader.getConfig());
}
