import {ExError, INodeRunData, Request, Route} from '@sora-soft/framework';
import {ValidateClass} from '@sora-soft/type-guard';
import {Com} from '../../lib/Com.js';
import {ForwardRPCHeader} from '../../lib/Const.js';
import {Pvd} from '../../lib/Provider.js';
import {AuthRoute} from '../../lib/route/AuthRoute.js';
import {AppError} from '../AppError.js';
import {AppErrorCode, UserErrorCode} from '../ErrorCode.js';
import {RedisKey} from '../Keys.js';
import {MonitorService} from '../service/MonitorService.js';
import {MonitorWorld} from '../monitor/MonitorWorld.js';
import {UserError} from '../UserError.js';
import {NotifyName} from '../gateway/NotifyType.js';

@ValidateClass()
class MonitorHandler extends AuthRoute<MonitorService> {
  @Route.method
  async fetchAllNodeRunningData() {
    const data = await Com.businessRedis.client.hGetAll(RedisKey.targetClusterNodeRunData(this.service.targetScope));
    const result: INodeRunData[] = [];
    for (const [_, str] of Object.entries(data)) {
      result.push(JSON.parse(str) as INodeRunData);
    }

    return {
      nodes: result,
    };
  }

  @Route.method
  async registerNodeMetaDataNotify(body: void, request: Request) {
    const session = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_SESSION);
    if (!session) {
      throw new AppError(AppErrorCode.ERR_NO_SESSION, 'ERR_NO_SESSION');
    }

    const gatewayId = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_ID);
    if (!gatewayId) {
      throw new AppError(AppErrorCode.ERR_NOT_FROM_GATEWAY, 'ERR_NOT_FROM_GATEWAY');
    }

    await Pvd.httpGateway.rpc(this.service.id, gatewayId).registerClientNotify({
      session,
      name: NotifyName.NodeMetaDataNotify,
    }).catch((err: ExError) => {
      if(err.code === AppErrorCode.ERR_SESSION_NOT_AVALIABLE) {
        throw new UserError(UserErrorCode.ERR_NOTIFY_NOT_ENALBED_IN_THIS_CLIENT, 'ERR_NOTIFY_NOT_ENALBED_IN_THIS_CLIENT');
      }
      throw err;
    });

    const current = await MonitorWorld.fetchClusterNodeMetaData(this.service.targetScope);
    return {
      nodes: current,
    };
  }

  @Route.method
  async unregisterNodeMetaDataNotify(body: void, request: Request) {
    const session = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_SESSION);
    if (!session) {
      throw new AppError(AppErrorCode.ERR_NO_SESSION, 'ERR_NO_SESSION');
    }
    const gatewayId = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_ID);
    if (!gatewayId) {
      throw new AppError(AppErrorCode.ERR_NOT_FROM_GATEWAY, 'ERR_NOT_FROM_GATEWAY');
    }

    await Pvd.httpGateway.rpc(this.service.id, gatewayId).unregisterClientNotify({
      session,
      name: NotifyName.NodeMetaDataNotify,
    }).catch((err: ExError) => {
      if(err.code === AppErrorCode.ERR_SESSION_NOT_AVALIABLE) {
        throw new UserError(UserErrorCode.ERR_NOTIFY_NOT_ENALBED_IN_THIS_CLIENT, 'ERR_NOTIFY_NOT_ENALBED_IN_THIS_CLIENT');
      }
      throw err;
    });

    return {};
  }

  @Route.method
  async registerNodeRunningDataNotify(body: void, request: Request) {
    const session = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_SESSION);
    if (!session) {
      throw new AppError(AppErrorCode.ERR_NO_SESSION, 'ERR_NO_SESSION');
    }

    const gatewayId = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_ID);
    if (!gatewayId) {
      throw new AppError(AppErrorCode.ERR_NOT_FROM_GATEWAY, 'ERR_NOT_FROM_GATEWAY');
    }

    await Pvd.httpGateway.rpc(this.service.id, gatewayId).registerClientNotify({
      session,
      name: NotifyName.NodeRunningDataNotify,
    }).catch((err: ExError) => {
      if(err.code === AppErrorCode.ERR_SESSION_NOT_AVALIABLE) {
        throw new UserError(UserErrorCode.ERR_NOTIFY_NOT_ENALBED_IN_THIS_CLIENT, 'ERR_NOTIFY_NOT_ENALBED_IN_THIS_CLIENT');
      }
      throw err;
    });

    const current = await MonitorWorld.fetchClusterNodeRunningData(this.service.targetScope);
    return {
      nodes: current,
    };
  }

  @Route.method
  async unregisterNodeRunningDataNotify(body: void, request: Request) {
    const session = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_SESSION);
    if (!session) {
      throw new AppError(AppErrorCode.ERR_NO_SESSION, 'ERR_NO_SESSION');
    }
    const gatewayId = request.getHeader<string>(ForwardRPCHeader.RPC_GATEWAY_ID);
    if (!gatewayId) {
      throw new AppError(AppErrorCode.ERR_NOT_FROM_GATEWAY, 'ERR_NOT_FROM_GATEWAY');
    }

    await Pvd.httpGateway.rpc(this.service.id, gatewayId).unregisterClientNotify({
      session,
      name: NotifyName.NodeRunningDataNotify,
    }).catch((err: ExError) => {
      if(err.code === AppErrorCode.ERR_SESSION_NOT_AVALIABLE) {
        throw new UserError(UserErrorCode.ERR_NOTIFY_NOT_ENALBED_IN_THIS_CLIENT, 'ERR_NOTIFY_NOT_ENALBED_IN_THIS_CLIENT');
      }
      throw err;
    });

    return {};
  }
}

export {MonitorHandler};
