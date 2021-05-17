import {ConfigFileType} from './Enum';
import fs = require('fs/promises');
import url = require('url');
import yaml = require('js-yaml');
import axios from 'axios';
import {AppError} from '../app/AppError';
import {AppErrorCode} from '../app/ErrorCode';
import path = require('path');

class ConfigLoader<T extends {}> {
  async readFile(filepath: string, type: ConfigFileType.RAW): Promise<Buffer>
  async readFile(filepath: string, type: ConfigFileType.JSON | ConfigFileType.YAML): Promise<T>
  async readFile(filepath: string, type: ConfigFileType) {
    const fileContent = await fs.readFile(filepath);
    switch(type) {
      case ConfigFileType.JSON:
        return JSON.parse(fileContent.toString());
      case ConfigFileType.YAML:
        return yaml.load(fileContent.toString());
      case ConfigFileType.RAW:
        return fileContent;
    }
  }

  async readURL(target: string) {
    const response = await axios.get(target);
    if (response.status === 200 && !response.data.error) {
      return response.data;
    }
    throw new AppError(AppErrorCode.ERR_LOAD_CONFIG, `ERR_LOAD_CONFIG, url=${url}`);
  }

  async load(targetUrl: string) {
    const protocol = targetUrl.split(':')[0];
    switch (protocol) {
      case 'http':
      case 'https':
        this.config_ = await this.readURL(targetUrl);
        break;
      case 'file':
      default:
        const target = url.pathToFileURL(targetUrl);
        const extname = path.extname(targetUrl);
        const filePath = path.resolve(process.cwd(), target.pathname);
        switch (extname) {
          case '.yaml':
          case '.yml':
            this.config_ = await this.readFile(filePath, ConfigFileType.YAML);
            break;
          case '.json':
          default:
            this.config_ = await this.readFile(filePath, ConfigFileType.JSON);
            break;
        }
        break;
    }
  }

  getConfig() {
    return this.config_;
  }

  private config_: T;
}

export {ConfigLoader}
