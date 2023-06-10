import {Route} from '@sora-soft/framework';
import {ValidateClass, AssertType} from '@sora-soft/type-guard';
import {ConfigRoute} from '../../lib/route/ConfigRoute.js';
import {Com} from '../../lib/Com.js';
import {ConfigFile} from '../database/Config.js';
import {UserError} from '../UserError.js';
import {UserErrorCode} from '../ErrorCode.js';
import template from 'art-template';
import {ConfigFileType} from '../../lib/Enum.js';
import yaml = require('js-yaml');

interface IReqFetchConfig {
  name: string;
  [k: string]: string;
}

@ValidateClass()
class ConfigHandler extends ConfigRoute {
  @Route.method
  async fetchConfig(@AssertType() body: IReqFetchConfig) {
    const file = await Com.businessDB.manager.findOne(ConfigFile, {
      where: {
        name: body.name,
      },
    });

    if (!file) {
      throw new UserError(UserErrorCode.ERR_CONFIG_FILE_NOT_FOUND, 'ERR_CONFIG_FILE_NOT_FOUND');
    }

    const final = template.render(file.context, body);

    switch (file.type) {
      case ConfigFileType.JSON:
        return JSON.parse(final) as unknown;
      case ConfigFileType.YAML:
        return yaml.load(final);
      case ConfigFileType.RAW:
        return final;
    }
  }
}

export {ConfigHandler};
