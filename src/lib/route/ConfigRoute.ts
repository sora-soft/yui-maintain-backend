import {ErrorLevel, ExError, IRawResPacket, ListenerCallback, Route} from '@sora-soft/framework';
import {IHttpRawResponse} from '@sora-soft/http-support';

class ConfigRoute extends Route {
  static callback(route: ConfigRoute): ListenerCallback {
    return async (packet, session, connector): Promise<IRawResPacket | null> => {
      const origin = Route.callback(route);
      const handleError = async (err: ExError) => {
        if (err.level === ErrorLevel.EXPECTED) {
          const response: IHttpRawResponse<{}> = {
            status: 401,
            headers: {},
            payload: err.toJson(),
          };
          await connector.sendRaw(response);
        } else {
          const response: IHttpRawResponse<{}> = {
            status: 500,
            headers: {},
            payload: err.toJson(),
          };
          await connector.sendRaw(response);
        }
      };

      try {
        const result = await origin(packet, session, connector);
        if (result) {
          if (result.payload.error) {
            const e = result.payload.error;
            const err = new ExError(e.code, e.name, e.message, e.level);
            await handleError(err);
          } else {
            const response: IHttpRawResponse<unknown> = {
              status: 200,
              headers: {},
              payload: result.payload.result,
            };
            await connector.sendRaw(response);
          }
        } else {
          const response: IHttpRawResponse<{}> = {
            status: 404,
            headers: {},
            payload: {},
          };
          await connector.sendRaw(response);
        }
      } catch(e) {
        const err = ExError.fromError(e as Error);
        await handleError(err);
      }
      return null;
    };
  }
}

export {ConfigRoute};
