import {ErrorLevel, ExError, IRawNetPacket, Logger, Notify, OPCode, Provider, Request, Response, Route, RPCError, RPCErrorCode, RPCHeader, RPCResponseError, Runtime, Service} from '@sora-soft/framework';
import {GuestGroupId} from '../../app/account/AccountType';
import {AccountWorld} from '../../app/account/AccountWorld';
import {Application} from '../../app/Application';
import {UserErrorCode, AppErrorCode} from '../../app/ErrorCode';
import {ServiceName} from '../../app/service/common/ServiceName';
import {AuthRPCHeader, ForwardRPCHeader} from '../Const';
import {NodeTime} from '../Utility';

type RouteMap = { [key in ServiceName]?: Provider<Route>};

class ForwardRoute<T extends Service = Service> extends Route<T> {
  constructor(service: T, route: RouteMap) {
    super(service);
    this.providerMap_ = new Map();
    for (const [name, value] of Object.entries(route)) {
      if (value) {
        this.providerMap_.set(name, value);
      }
    }
  }

  private providerMap_: Map<string, Provider<Route>>;

  private getProvider(service: ServiceName) {
    if (!this.providerMap_.has(service as ServiceName))
      throw new RPCError(RPCErrorCode.ERR_RPC_SERVICE_NOT_FOUND, `ERR_RPC_SERVICE_NOT_FOUND, service=${service}`);

    const provider: Provider<Route> | undefined = this.providerMap_.get(service);
    if (!provider)
      throw new RPCError(RPCErrorCode.ERR_RPC_PROVIDER_NOT_AVAILABLE, `ERR_RPC_PROVIDER_NOT_AVAILABLE, service=${service}`);

    return provider;
  }

  static callback(route: ForwardRoute) {
    return (async (packet: IRawNetPacket, session: string) => {
      const account = await AccountWorld.getAccountSession(session);
      const gid = account ? account.gid : GuestGroupId;

      const startTime = Date.now();
      switch (packet.opcode) {
        case OPCode.REQUEST: {
          const request = new Request(packet);
          const response = new Response();
          if (!packet.path)
            this.makeErrorRPCResponse(request, response, new RPCResponseError(RPCErrorCode.ERR_RPC_METHOD_NOT_FOUND, ErrorLevel.EXPECTED, `ERR_RPC_METHOD_NOT_FOUND`))

          const [service, method] = packet.path?.split('/').slice(-2) as [ServiceName, string];
          const shouldForward = service !== route.service.name;

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
            // 转发至其他服务
            const provider = route.getProvider(service);

            const res: Response<unknown> = await provider.caller.rpc(route.service.id)[method](request.payload, {
              headers: {
                [ForwardRPCHeader.RPC_GATEWAY_ID]: route.service.id,
                [ForwardRPCHeader.RPC_GATEWAY_SESSION]: session,
                [AuthRPCHeader.RPC_AUTH_GID]: gid,
                [AuthRPCHeader.RPC_ACCOUNT_ID]: account ? account.accountId : null
              },
              timeout: NodeTime.second(60),
            }, true).catch((error: ExError) => {
              switch (error.level) {
                case ErrorLevel.EXPECTED:
                  throw new RPCResponseError(error.code as RPCErrorCode, ErrorLevel.EXPECTED, error.message);
                default:
                  Application.appLog.error('forward-route', error, { error: Logger.errorMessage(error), service, method });
                  throw new RPCResponseError(UserErrorCode.ERR_SERVER_INTERNAL, ErrorLevel.UNEXPECTED, `ERR_SERVER_INTERNAL`);
              }
            });
            response.payload = res.payload;
            Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: request.method, duration: Date.now() - startTime });
            return response.toPacket();
          }
        }
        case OPCode.NOTIFY: {
          const notify = new Notify(packet);
          notify.setHeader(RPCHeader.RPC_SESSION_HEADER, session);
          Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: notify.method, notify: notify.payload });

          if (!packet.path)
            return;

          const [service, method] = packet.path?.split('/').slice(-2) as [ServiceName, string];
          const shouldForward = service !== route.service.name;

          if (!shouldForward) {
            // 调用 route 本身方法
            await route.callNotify(notify.method, notify).catch(err => {
              Runtime.frameLogger.error('forward-route', err, { event: 'notify-handler', error: Logger.errorMessage(err), service: route.service.name, method: notify.method, request: notify.payload });
            });
            Runtime.rpcLogger.debug('forward-route', { service: route.service.name, method: notify.method, notify: notify.payload, duration: Date.now() - startTime });
            return null;
          } else {
            // 转发至其他服务
            const provider = route.getProvider(service as ServiceName);

            await provider.caller.notify(route.service.id)[method](notify.payload, {
              headers: {
                [ForwardRPCHeader.RPC_GATEWAY_ID]: route.service.id,
                [ForwardRPCHeader.RPC_GATEWAY_SESSION]: session,
                [AuthRPCHeader.RPC_AUTH_GID]: gid,
                [AuthRPCHeader.RPC_ACCOUNT_ID]: account ? account.accountId : null
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
    }) as any;
  }
}

export {ForwardRoute}
