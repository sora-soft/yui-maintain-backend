import {ErrorLevel, ExError, IRawResPacket, ListenerCallback, Logger, NodeTime, Notify, OPCode, Provider, Request, Response, Route, RPCError, RPCErrorCode, RPCHeader, RPCResponseError, Runtime, Service} from '@sora-soft/framework';
import {GuestGroupId} from '../../app/account/AccountType.js';
import {AccountWorld} from '../../app/account/AccountWorld.js';
import {Application} from '../../app/Application.js';
import {AccountToken} from '../../app/database/Account.js';
import {UserErrorCode} from '../../app/ErrorCode.js';
import {ServiceName} from '../../app/service/common/ServiceName.js';
import {AuthRPCHeader, ForwardRPCHeader} from '../Const.js';

type RouteMap = { [key in ServiceName]?: Provider<Route>};

class ForwardRoute<T extends Service = Service> extends Route {
  constructor(service: T, route: RouteMap) {
    super();
    this.service = service;
    this.routeProviderMap_ = new Map();
    for (const [name, value] of Object.entries(route)) {
      if (value) {
        this.routeProviderMap_.set(name, value);
      }
    }
  }

  private routeProviderMap_: Map<string, Provider<Route>>;
  private service: T;

  private getProvider(service: ServiceName) {
    if (!this.routeProviderMap_.has(service))
      throw new RPCError(RPCErrorCode.ERR_RPC_SERVICE_NOT_FOUND, `ERR_RPC_SERVICE_NOT_FOUND, service=${service}`);

    const provider: Provider<Route> | undefined = this.routeProviderMap_.get(service);
    if (!provider)
      throw new RPCError(RPCErrorCode.ERR_RPC_PROVIDER_NOT_AVAILABLE, `ERR_RPC_PROVIDER_NOT_AVAILABLE, service=${service}`);

    return provider;
  }

  private static async fetchIncomingToken(incoming: Notify | Request) {
    const authorizationHeader = incoming.getHeader<string>('authorization');
    let authorization: string | null = null;
    if (authorizationHeader) {
      const [scheme, headerToken] = authorizationHeader.split(' ');
      if (scheme === 'sora-rpc-authorization' && headerToken) {
        authorization = headerToken;
      }
    }
    if (!authorization)
      authorization = incoming.getHeader<string>(AuthRPCHeader.RPC_AUTHORIZATION) || null;

    let token: AccountToken | null = null;
    if (authorization) {
      token = await AccountWorld.getAccountSession(authorization);
    }

    return token;
  }

  static callback(route: ForwardRoute): ListenerCallback {
    return async (packet, session, connector): Promise<IRawResPacket | null> => {
      const startTime = Date.now();
      switch (packet.opcode) {
        case OPCode.REQUEST: {
          const request = new Request(packet);
          const response = new Response<unknown>({
            headers: {},
            payload: {error: null, result: null},
          });
          if (!packet.service)
            this.makeErrorRPCResponse(request, response, new RPCResponseError(RPCErrorCode.ERR_RPC_METHOD_NOT_FOUND, ErrorLevel.EXPECTED, 'ERR_RPC_METHOD_NOT_FOUND'));

          const service = request.service as ServiceName;
          const method = request.method;
          const shouldForward = service !== route.service.name;
          const token = await this.fetchIncomingToken(request);

          const rpcId = request.getHeader(RPCHeader.RPC_ID_HEADER);
          request.setHeader(AuthRPCHeader.RPC_AUTHORIZATION, token?.session);
          request.setHeader(AuthRPCHeader.RPC_AUTH_GID, token?.gid || GuestGroupId);
          request.setHeader(AuthRPCHeader.RPC_ACCOUNT_ID, token?.accountId);
          request.setHeader(RPCHeader.RPC_SESSION_HEADER, session);
          Runtime.rpcLogger.debug('forward-route', {service: route.service.name, method: request.method, request: request.payload});

          response.setHeader(RPCHeader.RPC_ID_HEADER, rpcId);
          response.setHeader(RPCHeader.RPC_FROM_ID_HEADER, route.service.id);

          if (!shouldForward) {
            // 调用 route 本身方法
            const result = await route.callMethod(request.method, request, response, connector).catch((err: ExError) => {
              if (err.level !== ErrorLevel.EXPECTED) {
                Runtime.rpcLogger.error('forward-route', err, {event: 'rpc-handler', error: Logger.errorMessage(err), service: route.service.name, method: request.method, request: request.payload});
                return {
                  error: {
                    code: UserErrorCode.ERR_SERVER_INTERNAL,
                    name: 'RPCResponseError',
                    level: ErrorLevel.UNEXPECTED,
                    message: 'ERR_SERVER_INTERNAL',
                  },
                  result: null,
                };
              }
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
            Runtime.rpcLogger.debug('forward-route', {service: route.service.name, method: request.method, duration: Date.now() - startTime});
            return response.toPacket();
          } else {
            // 转发至其他服务
            const provider = route.getProvider(service);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const res: Response<unknown> = await provider.rpc(route.service.id)[method](request.payload, {
              headers: {
                [ForwardRPCHeader.RPC_GATEWAY_ID]: route.service.id,
                [ForwardRPCHeader.RPC_GATEWAY_SESSION]: session,
                [AuthRPCHeader.RPC_AUTH_GID]: token?.gid || GuestGroupId,
                [AuthRPCHeader.RPC_ACCOUNT_ID]: token ? token.accountId : null,
                [AuthRPCHeader.RPC_AUTHORIZATION]: token?.session,
              },
              timeout: NodeTime.second(60),
            }, true).catch((error: ExError) => {
              switch (error.level) {
                case ErrorLevel.EXPECTED:
                  throw new RPCResponseError(error.code as RPCErrorCode, ErrorLevel.EXPECTED, error.message);
                default:
                  Application.appLog.error('forward-route', error, {error: Logger.errorMessage(error), service, method});
                  throw new RPCResponseError(UserErrorCode.ERR_SERVER_INTERNAL, ErrorLevel.UNEXPECTED, 'ERR_SERVER_INTERNAL');
              }
            });
            response.payload = res.payload;
            Runtime.rpcLogger.debug('forward-route', {service: route.service.name, method: request.method, duration: Date.now() - startTime});
            return response.toPacket();
          }
        }
        case OPCode.NOTIFY: {
          const notify = new Notify(packet);
          const token = await this.fetchIncomingToken(notify);

          notify.setHeader(RPCHeader.RPC_SESSION_HEADER, session);
          notify.setHeader(AuthRPCHeader.RPC_AUTH_GID, token?.gid || GuestGroupId);
          notify.setHeader(AuthRPCHeader.RPC_ACCOUNT_ID, token?.accountId);
          notify.setHeader(AuthRPCHeader.RPC_AUTHORIZATION, token?.session);
          Runtime.rpcLogger.debug('forward-route', {service: route.service.name, method: notify.method});

          if (!packet.service)
            return null;

          const service = notify.service as ServiceName;
          const method = notify.method;
          const shouldForward = service !== route.service.name;

          if (!shouldForward) {
            // 调用 route 本身方法
            await route.callNotify(notify.method, notify, connector).catch((err: ExError) => {
              Runtime.frameLogger.error('forward-route', err, {event: 'notify-handler', error: Logger.errorMessage(err), service: route.service.name, method: notify.method, request: notify.payload});
            });
            Runtime.rpcLogger.debug('forward-route', {service: route.service.name, method: notify.method, duration: Date.now() - startTime});
            return null;
          } else {
            // 转发至其他服务
            const provider = route.getProvider(service );

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await provider.notify(route.service.id)[method](notify.payload, {
              headers: {
                [ForwardRPCHeader.RPC_GATEWAY_ID]: route.service.id,
                [ForwardRPCHeader.RPC_GATEWAY_SESSION]: session,
                [AuthRPCHeader.RPC_AUTH_GID]: token?.gid || GuestGroupId,
                [AuthRPCHeader.RPC_ACCOUNT_ID]: token ? token.accountId : null,
                [AuthRPCHeader.RPC_AUTHORIZATION]: token?.session,
              },
            });
            Runtime.rpcLogger.debug('forward-route', {service: route.service.name, method: notify.method, duration: Date.now() - startTime});
            return null;
          }
        }
        default:
          return null;
      }
    };
  }
}

export {ForwardRoute};
