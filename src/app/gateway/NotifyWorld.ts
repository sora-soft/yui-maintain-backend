import {ArrayMap, ConvertRouteMethod, IRequestOptions, Route} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {Pvd} from '../../lib/Provider.js';
import {EtcdKey} from '../Keys.js';

class NotifyWorld {
  static sendNotifyToGateway<T extends Route = Route>() {
    return new Proxy<ConvertRouteMethod<T>>({} as ConvertRouteMethod<T>, {
      get: (target, prop: string) => {
        return async (notify: unknown, options: IRequestOptions = {}) => {
          const results = await Com.etcd.client.getAll().prefix(`${EtcdKey.notifyName(prop)}/`).exec();
          const gatewayNotifyMap = new ArrayMap<string, string>();

          for (const kv of results.kvs) {
            const key = kv.key.toString();
            const gatewayId = kv.value.toString();
            const session = key.split('/').at(-1);
            if (!session) {
              continue;
            }
            gatewayNotifyMap.append(gatewayId, session);
          }

          for (const [gateway, sessions] of gatewayNotifyMap.entries()) {
            await Pvd.httpGateway.notify(null, gateway).notifyToClient({
              sessions,
              name: prop,
              notify,
            }, options);
          }
        };
      },
    });
  }
}

export {NotifyWorld};
