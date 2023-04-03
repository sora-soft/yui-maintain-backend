import {Route, INodeNotifyHandler, INodeRunDataDiff} from '@sora-soft/framework';
import {ValidateClass} from '@sora-soft/type-guard';
import type {TargetCluster} from './TargetCluster.js';

@ValidateClass()
class NodeNotifyHandler extends Route implements INodeNotifyHandler {
  constructor(cluster: TargetCluster) {
    super();
    this.cluster_ = cluster;
  }

  @Route.notify
  async notifyNodeState(body: INodeRunDataDiff): Promise<void> {
    this.cluster_.updateNodeRunningData(body.id, body.diff);
  }

  private cluster_: TargetCluster;
}

export {NodeNotifyHandler};
