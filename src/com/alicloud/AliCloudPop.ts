import PopCore = require('@alicloud/pop-core');
import {IAliCloudCommonConfig} from './AliCloudType';

export interface IAliCloudPopConfig {
  accountName: string;
}

export interface IReqSendSingleEmail {
  AccountName?: string;
  AddressType?: number;
  ReplyToAddress?: boolean;
  Subject: string;
  ToAddress: string;
  Action?: string;
  ClickTrace?: string;
  FromAlias?: string;
  HtmlBody?: string;
  TagName?: string;
  TextBody?: string;
}

class AliCloudPop {
  constructor(config: IAliCloudCommonConfig, popConfig: IAliCloudPopConfig) {
    this.popConfig_ = popConfig;
    this.popCore_ = new PopCore({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: 'https://dm.aliyuncs.com',
      apiVersion: '2015-11-23',
    });
  }

  async sendSingleEmail(req: IReqSendSingleEmail) {
    return this.popCore_.request('SingleSendMail', {
      ReplyToAddress: false,
      AddressType: 1,
      AccountName: this.popConfig_.accountName,
      ...req,
    }, {method: 'post'});
  }

  private popConfig_: IAliCloudPopConfig;
  private popCore_: PopCore;
}

export {AliCloudPop};
