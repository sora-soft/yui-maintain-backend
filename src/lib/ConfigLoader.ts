import {ConfigFileType} from './Enum';
import fs = require('fs/promises');
import url = require('url');
import util = require('util');
import yaml = require('js-yaml');
import axios, {AxiosResponse} from 'axios';
import {AppError} from '../app/AppError';
import {AppErrorCode} from '../app/ErrorCode';
import path = require('path');
import process = require('process');
import {Util} from './Utility';

const CONFIG_MASK = '***';
const PRIVATE_TOKEN = '*';

class ConfigLoader<T extends {}> {
  async readFile(filepath: string, type: ConfigFileType.RAW): Promise<Buffer>
  async readFile(filepath: string, type: ConfigFileType.JSON | ConfigFileType.YAML): Promise<T>
  async readFile(filepath: string, type: ConfigFileType) {
    const fileContent = await fs.readFile(filepath);
    switch(type) {
      case ConfigFileType.JSON:
        return JSON.parse(fileContent.toString()) as T;
      case ConfigFileType.YAML:
        return yaml.load(fileContent.toString());
      case ConfigFileType.RAW:
        return fileContent;
    }
  }

  async readURL(target: string) {
    const response = await axios.get<unknown, AxiosResponse<{error: unknown}>>(target);
    if (response.status === 200 && !response.data.error) {
      return response.data as unknown as T;
    }
    throw new AppError(AppErrorCode.ERR_LOAD_CONFIG, `ERR_LOAD_CONFIG, url=${target}`);
  }

  async load(targetUrl: string) {
    const protocol = targetUrl.split(':')[0];
    switch (protocol) {
      case 'http':
      case 'https':
        this.loadConfig(await this.readURL(targetUrl));
        break;
      case 'file':
      default:
        const extname = path.extname(targetUrl);
        let filePath: string;
        if (process.platform === 'win32') {
          filePath = targetUrl;
        } else {
          const target = url.pathToFileURL(targetUrl);
          filePath = path.resolve(process.cwd(), target.pathname);
        }

        switch (extname) {
          case '.yaml':
          case '.yml':
            this.loadConfig(await this.readFile(filePath, ConfigFileType.YAML));
            break;
          case '.json':
          default:
            this.loadConfig(await this.readFile(filePath, ConfigFileType.JSON));
            break;
        }
        break;
    }
  }

  private loadConfig(config: T) {
    this.config_ = this.createConfigProxy(config);
  }

  private hidePrivateKey(config: Object) {
    const result = {};
    for (const [key, value] of Object.entries(config)) {
      if (key[key.length - 1] === PRIVATE_TOKEN) {
        result[key.slice(0, -1)] = CONFIG_MASK;
        continue;
      }
      if (Array.isArray(value)) {
        result[key] = value.map(this.createConfigProxy) as unknown[];
      }
      if (typeof value === 'object') {
        if (value === null)
          result[key] = null;
        result[key] = this.hidePrivateKey(value as Object);
      }
      result[key] = value as unknown;
    }
    return result;
  }

  createConfigProxy<C extends Object>(raw: C): C {
    if (util.types.isProxy(raw))
      return raw;

    const config = JSON.parse(JSON.stringify(raw)) as C;

    if (Array.isArray(config))
      return config.map((v) => this.createConfigProxy(v as Object)) as unknown as C;

    if (typeof config !== 'object')
      return config;

    const hiddenKeys: string[] = [];
    for (const [key, value] of Object.entries(config)) {
      if (key[key.length - 1] === PRIVATE_TOKEN) {
        hiddenKeys.push(key.slice(0, -1));
      }

      if (Array.isArray(value)) {
        config[key] = value.map(v => this.createConfigProxy(v) as unknown);
        continue;
      }

      if (typeof value === 'object') {
        config[key] = this.createConfigProxy(value) as unknown;
      }
    }

    config[util.inspect.custom] = () => {
      return this.hidePrivateKey(config);
    };

    const proxy = new Proxy(config, {
      get: (target, property) => {
        if (typeof property === 'symbol') {
          return target[property] as unknown;
        }

        if (property === 'toJSON') {
          return () => {return this.hidePrivateKey(config);};
        }
        return (Util.isUndefined(config[property]) ? config[`${property}*`] : config[property]) as unknown;
      },
      set: () => {
        return false;
      },
      ownKeys: (target) => {
        const result = Object.getOwnPropertyNames(target).map((property) => {
          return  property[property.length - 1] === PRIVATE_TOKEN ? property.slice(0, -1) : property;
        });
        return result;
      },
      has: (target, key) => {
        return Object.keys(config).map(property => {
          return property[property.length - 1] === PRIVATE_TOKEN ? property.slice(0, -1) : property;
        }).includes(key as string);
      },
      getOwnPropertyDescriptor: (target, property) => {
        if (typeof property === 'symbol')
          return Object.getOwnPropertyDescriptor(target, property);

        if (hiddenKeys.includes(property)) {
          const descriptor = Object.getOwnPropertyDescriptor(target, `${property}${PRIVATE_TOKEN}`);
          if (!descriptor) {
            return undefined;
          }
          descriptor.value = CONFIG_MASK;
          return descriptor;
        } else {
          return Object.getOwnPropertyDescriptor(target, property);
        }
      }
    });

    return proxy;
  }

  getConfig() {
    return this.config_;
  }

  private config_: T;
}

export {ConfigLoader};
