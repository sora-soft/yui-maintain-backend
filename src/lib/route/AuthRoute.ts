import {IRawNetPacket, ListenerCallback, Route, Service} from '@sora-soft/framework';
import {AccountWorld} from '../../app/account/AccountWorld';

class AuthRoute<T extends Service = Service> extends Route<T> {
  static callback(route: Route): ListenerCallback {
    return async (packet: IRawNetPacket, session: string) => {
      const account = await AccountWorld.getAccountSession(session);
      if (!account) {}
      return null;
    }
  }
}

export {AuthRoute}
