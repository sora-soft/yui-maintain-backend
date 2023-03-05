import {Component, IComponentOptions} from '@sora-soft/framework';
import {AssertType, ValidateClass} from 'typescript-is';
import {AliCloudError, AliCloudErrorCode} from './AliCloudError';
import {AliCloudPop, IAliCloudPopConfig} from './AliCloudPop';
import {IAliCloudCommonConfig} from './AliCloudType';

export interface IAliCloudComponentOptions extends IComponentOptions, IAliCloudCommonConfig {
  pop?: IAliCloudPopConfig;
}

@ValidateClass()
class AliCloudComponent extends Component {
  protected setOptions(@AssertType() options: IAliCloudComponentOptions) {
    this.aliCloudOptions_ = options;
  }

  protected async connect() {
    if (this.aliCloudOptions_.pop) {
      this.pop_ = new AliCloudPop({
        accessKeyId: this.aliCloudOptions_.accessKeyId,
        accessKeySecret: this.aliCloudOptions_.accessKeySecret,
      }, this.aliCloudOptions_.pop);
    }
  }

  protected async disconnect() {
  }

  get pop() {
    if (!this.pop_)
      throw new AliCloudError(AliCloudErrorCode.ERR_SUB_NOT_LOADED, 'ERR_SUB_NOT_LOADED, module=pop');

    return this.pop_;
  }

  get version() {
    return '0.0.0';
  }

  private aliCloudOptions_: IAliCloudComponentOptions;
  private pop_: AliCloudPop;
}

export {AliCloudComponent};
