import {Route, INodeNotifyHandler, INodeRunData} from '@sora-soft/framework';
import {AssertType, ValidateClass} from '@sora-soft/type-guard';
import {TargetCluster} from './TargetCluster.js';

@ValidateClass()
class NodeNotifyHandler extends Route implements INodeNotifyHandler {
  constructor(cluster: TargetCluster) {
    super();
    this.cluster_ = cluster;
  }

  @Route.notify
  async notifyNodeState(@AssertType() body: INodeRunData): Promise<void> {
    this.cluster_.updateNodeRunningData(body);
  }

  private cluster_: TargetCluster;
}

export {NodeNotifyHandler};
