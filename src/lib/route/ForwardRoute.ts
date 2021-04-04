import {ErrorLevel, ExError, IRawNetPacket, ListenerCallback, Logger, Notify, OPCode, Provider, Request, Response, Route, RPCError, RPCErrorCode, RPCHeader, Runtime, Service} from '@sora-soft/framework';
import {AuthGroupId, GuestGroupId} from '../../app/account/AccountType';
import {AccountWorld} from '../../app/account/AccountWorld';
import {UserErrorCode} from '../../app/ErrorCode';
import {ServiceName} from '../../app/service/common/ServiceName';
import {UserError} from '../../app/UserError';
import {ForwardRPCHeader} from '../Const';

export type AuthChecker = (gid: AuthGroupId, service: string, method: string, request: Request<unknown>) => Promise<boolean>;

interface IRouteInfo {
  provider: Provider<Route>,
  authChecker?: AuthChecker;
};

type RouteMap = { [key in ServiceName]?: IRouteInfo | Provider<Route>};

const defaultAuthChecker: AuthChecker = async (gid, service, method) => {
  return await AccountWorld.hasAuth(gid, `${service}.${method}`);
}

const alwaysAllowAuthChecker: AuthChecker = async () => {
  return true;
}

class ForwardRoute<T extends Service = Service> extends Route<T> {
  constructor(service: T, route: RouteMap, skipAuthCheck: boolean) {
    super(service);
    this.routeMap_ = new Map();
    for (const [name, value] of Object.entries(route)) {
      let info: IRouteInfo;
      if (value instanceof Provider) {
        info = {
          provider: value
        };
      } else {
        info = value;
      }

      if (skipAuthCheck) {
        info.authChecker = alwaysAllowAuthChecker;
      }

      this.routeMap_.set(name, info);
    }
  }

  private routeMap_: Map<string, IRouteInfo>;

  private getProvider(service: ServiceName) {
    if (!this.routeMap_.has(service as ServiceName))
      throw new RPCError(RPCErrorCode.ERR_RPC_SERVICE_NOT_FOUND, `ERR_RPC_SERVICE_NOT_FOUND, service=${service}`);

    const info: IRouteInfo = this.routeMap_.get(service);
    if (!info)
      throw new RPCError(RPCErrorCode.ERR_RPC_PROVIDER_NOT_AVAILABLE, `ERR_RPC_PROVIDER_NOT_AVAILABLE, service=${service}`);

    const provider: Provider<Route> = info.provider;
    if (!provider)
      throw new RPCError(RPCErrorCode.ERR_RPC_PROVIDER_NOT_AVAILABLE, `ERR_RPC_PROVIDER_NOT_AVAILABLE, service=${service}`);

    return provider;
  }

  private getAuthChecker(service: ServiceName) {
    if (!this.routeMap_.has(service as ServiceName))
      throw new RPCError(RPCErrorCode.ERR_RPC_SERVICE_NOT_FOUND, `ERR_RPC_SERVICE_NOT_FOUND, service=${service}`);

    const info: IRouteInfo = this.routeMap_.get(service);
    if (!info)
      throw new RPCError(RPCErrorCode.ERR_RPC_PROVIDER_NOT_AVAILABLE, `ERR_RPC_PROVIDER_NOT_AVAILABLE, service=${service}`);

    return info.authChecker || defaultAuthChecker;
  }

  static callback(route: ForwardRoute): ListenerCallback {
    return async (packet: IRawNetPacket, session: string) => {
      const account = await AccountWorld.getAccountSession(session);
      const gid = account ? account.gid : GuestGroupId;

      const [service, method] = packet.path.split('/').slice(-2) as [ServiceName, string];
      const shouldForward = service !== route.service.name;

      const startTime = Date.now();
      switch (packet.opcode) {
        case OPCode.REQUEST: {
          const request = new Request(packet);
          const response = new Response();
          const rpcId = request.getHeader(RPCHeader.RPC_ID_HEADER);
          request.setHeader(RPCHeader.RPC_SESSION_HEADER, session);
          Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: request.method, request: request.payload });

          response.setHeader(RPCHeader.RPC_ID_HEADER, rpcId);
          response.setHeader(RPCHeader.RPC_FROM_ID_HEADER, route.service.id);

          if (!shouldForward) {
            // 调用 route 本身方法
            const result = await route.callMethod(request.method, request, response).catch((err: ExError) => {
              Runtime.frameLogger.error('forward-route', err, { event: 'rpc-handler', error: Logger.errorMessage(err), service: route.service.name, method: request.method, request: request.payload });
              return {
                error: {
                  code: err.code || RPCErrorCode.ERR_RPC_UNKNOWN,
                  level: err.level || ErrorLevel.UNEXPECTED,
                  name: err.name,
                  message: err.message,
                },
                result: null,
              };
            });
            response.payload = result;
            Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: request.method, request: request.payload, response: response.payload, duration: Date.now() - startTime });
            return response.toPacket();
          } else {
            // 权限验证
            const authChecker = route.getAuthChecker(service);
            const allowed = await authChecker(gid, service, method, request);
            if (!allowed) {
              const error = new UserError(UserErrorCode.ERR_AUTH_DENY, `ERR_AUTH_DENY, name=${service}.${method}`);
              Runtime.rpcLogger.debug('forward-route', { event: 'forward-handler', session, error: UserErrorCode.ERR_AUTH_DENY, message: `ERR_AUTH_DENY, name=${service}.${method}` });

              response.payload = {
                error: {
                  code: error.code,
                  level: error.level,
                  name: error.name,
                  message: error.message,
                },
                result: null,
              };
              return response.toPacket();
            }

            // 转发至其他服务
            const provider = route.getProvider(service);

            if (!provider.caller.rpc(route.service.id)[method])
              throw new RPCError(RPCErrorCode.ERR_RPC_METHOD_NOT_FOUND, `ERR_RPC_METHOD_NOT_FOUND, forward=${route.service.name}, service=${service}, method=${method}`);

            const res: Response<unknown> = await provider.caller.rpc(route.service.id)[method](request.payload, {
              headers: {
                [ForwardRPCHeader.RPC_GATEWAY_ID]: route.service.id,
                [ForwardRPCHeader.RPC_GATEWAY_SESSION]: session,
                [ForwardRPCHeader.RPC_AUTH_GID]: gid,
                [ForwardRPCHeader.RPC_NEED_AUTH_CHECK]: true,
              }
            }, true);
            Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: request.method, duration: Date.now() - startTime });
            return res.toPacket();
          }
        }
        case OPCode.NOTIFY: {
          const notify = new Notify(packet);
          notify.setHeader(RPCHeader.RPC_SESSION_HEADER, session);
          Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: notify.method, notify: notify.payload });

          if (!shouldForward) {
            // 调用 route 本身方法
            await route.callNotify(notify.method, notify).catch(err => {
              Runtime.frameLogger.error('forward-route', err, { event: 'notify-handler', error: Logger.errorMessage(err), service: route.service.name, method: notify.method, request: notify.payload });
            });
            Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: notify.method, notify: notify.payload, duration: Date.now() - startTime });
            return null;
          } else {
            // 权限验证
            const allowed = await AccountWorld.hasAuth(gid, `${service}.${method}`);
            if (!allowed) {
              Runtime.rpcLogger.debug('forward-route', { event: 'forward-handler', error: UserErrorCode.ERR_AUTH_DENY, message: `ERR_AUTH_DENY, name=${service}.${method}` });
              return null;
            }

            // 转发至其他服务
            const provider = route.getProvider(service as ServiceName);

            if (!provider.caller.notify(route.service.id)[method])
              throw new RPCError(RPCErrorCode.ERR_RPC_METHOD_NOT_FOUND, `ERR_RPC_METHOD_NOT_FOUND, forward=${route.service.name}, service=${service}, method=${method}`);

            await provider.caller.notify(route.service.id)[method](notify.payload, {
              headers: {
                [ForwardRPCHeader.RPC_GATEWAY_ID]: route.service.id,
                [ForwardRPCHeader.RPC_GATEWAY_SESSION]: session,
                [ForwardRPCHeader.RPC_AUTH_GID]: gid,
                [ForwardRPCHeader.RPC_NEED_AUTH_CHECK]: true,
              }
            });
            Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: notify.method, duration: Date.now() - startTime });
            return null;
          }
        }
        case OPCode.RESPONSE:
          // 不应该在路由处收到 rpc 回包消息
          return null;
      }
    }
  }
}

export {ForwardRoute}
