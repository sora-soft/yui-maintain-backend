import {Const, IRawNetPacket, ListenerCallback, Logger, Notify, OPCode, Provider, Request, Response, Route, RPCError, RPCErrorCode, Runtime, Service} from '@sora-soft/framework';
import {Pvd} from './Provider';

class ForwardRoute<T extends Service = Service> extends Route<T> {
  static callback(route: ForwardRoute): ListenerCallback {
    return async (packet: IRawNetPacket, session: string) => {
      const startTime = Date.now();
      switch (packet.opcode) {
        case OPCode.REQUEST:
          const request = new Request(packet);
          const response = new Response();
          const rpcId = request.getHeader(Const.RPC_ID_HEADER);
          request.setHeader(Const.RPC_SESSION_HEADER, session);
          Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: request.method, request: request.payload });
          if (route.hasMethod(request.method)) {
            // 调用 route 本身方法
            const result = await route.callMethod(request.method, request, response).catch(err => {
              Runtime.frameLogger.error('forward-route', err, { event: 'rpc-handler', error: Logger.errorMessage(err), service: route.service.name, method: request.method, request: request.payload });
              return {
                error: err.code || RPCErrorCode.ERR_RPC_UNKNOWN,
                message: err.message,
              }
            });
            response.setHeader(Const.RPC_ID_HEADER, rpcId);
            response.setHeader(Const.RPC_FROM_ID_HEADER, route.service.id);
            response.payload = result;
            Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: request.method, request: request.payload, response: response.payload, duration: Date.now() - startTime });
            return response.toPacket();
          } else {
            // 转发至其他服务
            const [_, category, version, service, method] = request.path.split('/');
            const provider: Provider<Route> = Pvd[service];
            if (!provider)
              throw new RPCError(RPCErrorCode.ERR_RPC_PROVIDER_NOT_AVAILABLE, `ERR_RPC_PROVIDER_NOT_AVAILABLE, service=${service}`);

            if (!provider.caller.rpc(route.service.id)[method])
              throw new RPCError(RPCErrorCode.ERR_RPC_METHOD_NOT_FOUND, `ERR_RPC_METHOD_NOT_FOUND, forward=${route.service.name}, service=${service}, method=${method}`);

            const res: Response<unknown> = await provider.caller.rpc(route.service.id)[method](request.payload, {
              headers: {
                'Rpc-forward': route.service.id
              }
            }, false);
            Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: request.method, duration: Date.now() - startTime });
            return res.toPacket();
          }
        case OPCode.NOTIFY:
          const notify = new Notify(packet);
          notify.setHeader(Const.RPC_SESSION_HEADER, session);
          Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: notify.method, notify: notify.payload });
          if (route.hasNotify(request.method)) {
            await route.callNotify(notify.method, notify).catch(err => {
              Runtime.frameLogger.error('forward-route', err, { event: 'notify-handler', error: Logger.errorMessage(err), service: route.service.name, method: notify.method, request: notify.payload })
            });
            Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: notify.method, notify: notify.payload, duration: Date.now() - startTime });
            return null;
          } else {
            const [_, category, version, service, method] = request.path.split('/');
            const provider: Provider<Route> = Pvd[service];
            if (!provider)
              throw new RPCError(RPCErrorCode.ERR_RPC_PROVIDER_NOT_AVAILABLE, `ERR_RPC_PROVIDER_NOT_AVAILABLE, service=${service}`);

            if (!provider.caller.notify(route.service.id)[method])
              throw new RPCError(RPCErrorCode.ERR_RPC_METHOD_NOT_FOUND, `ERR_RPC_METHOD_NOT_FOUND, forward=${route.service.name}, service=${service}, method=${method}`);

            await provider.caller.notify(route.service.id)[method](request.payload, {
              headers: {
                'Rpc-forward': route.service.id
              }
            });
            Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: request.method, duration: Date.now() - startTime });
            return null;
          }
        case OPCode.RESPONSE:
          // 不应该在路由处收到 rpc 回包消息
          return null;
      }
      return null;
    }
  }
}

export {ForwardRoute}
