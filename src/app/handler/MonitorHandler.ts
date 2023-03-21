import {Route} from '@sora-soft/framework';
import {ValidateClass} from '@sora-soft/type-guard';
import {AuthRoute} from '../../lib/route/AuthRoute.js';
import {MonitorService} from '../service/MonitorService.js';

interface IReqFetchNodeRunningData {
  id: string;
}

@ValidateClass()
class MonitorHandler extends AuthRoute<MonitorService> {
  @Route.method
  async fetchTargetClusterAllService() {
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
