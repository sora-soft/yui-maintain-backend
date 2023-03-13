import {Route} from '@sora-soft/framework';
import {ValidateClass} from 'typescript-is';
import {AuthRoute} from '../../lib/route/AuthRoute';
import {MonitorService} from '../service/MonitorService';

interface IReqFetchNodeRunningData {
  id: string;
}

@ValidateClass()
class MonitorHandler extends AuthRoute<MonitorService> {
  @Route.method
  async fetchTargetClusterAllService(body: void) {
    const serviceList = await this.service.target.discovery.getAllServiceList();

    return {
      serviceList,
    };
  }

  @Route.method
  async fetchNodeRunningData(body: IReqFetchNodeRunningData) {
    const data = await this.service.target.provider.rpc(this.service.id, body.id).fetchRunningData();

    return data;
  }
}

export {MonitorHandler};
