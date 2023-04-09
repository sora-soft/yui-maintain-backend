import {ExError, Request, Route, Runtime} from '@sora-soft/framework';
import {ValidateClass} from '@sora-soft/type-guard';
import {ForwardRPCHeader} from '../../lib/Const.js';
import {Pvd} from '../../lib/Provider.js';
import {AuthRoute} from '../../lib/route/AuthRoute.js';
import {AppError} from '../AppError.js';
import {AppErrorCode, UserErrorCode} from '../ErrorCode.js';
import {MonitorService} from '../service/MonitorService.js';
import {MonitorWorld} from '../monitor/MonitorWorld.js';
import {UserError} from '../UserError.js';
import {NotifyName} from '../gateway/NotifyType.js';

@ValidateClass()
class MonitorHandler extends AuthRoute<MonitorService> {
  @Route.method
  @AuthRoute.auth('cluster')
  async registerClusterUpdate(body: void, request: Request) {
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
      name: NotifyName.ClusterUpdate,
    }).catch((err: ExError) => {
      if(err.code === AppErrorCode.ERR_SESSION_NOT_AVALIABLE) {
        throw new UserError(UserErrorCode.ERR_NOTIFY_NOT_ENALBED_IN_THIS_CLIENT, 'ERR_NOTIFY_NOT_ENALBED_IN_THIS_CLIENT');
      }
      throw err;
    });

    const data = await MonitorWorld.fetchClusterData([this.service.targetScope, Runtime.scope]);
    return data;
  }

  @Route.method
  async unregisterClusterUpdate(body: void, request: Request) {
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
      name: NotifyName.ClusterUpdate,
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
