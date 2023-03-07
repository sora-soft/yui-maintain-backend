import {LifeCycleEvent, Listener, ListenerState} from '@sora-soft/framework';
import {Com} from '../../lib/Com';
import {EtcdKey} from '../Keys';

class TraefikWorld {
  static registerTraefikListener(prefix: string, protocol: string, name: string, listener: Listener) {
    const loadBalancerKey = EtcdKey.traefikConfigServiceUrl(prefix, protocol, name, listener.id);

    listener.stateEventEmitter.on(LifeCycleEvent.StateChangeTo, async (state) => {
      switch(state) {
        case ListenerState.READY: {
          await Com.etcd.lease.put(`${prefix}/${protocol}/services/${name}/loadBalancer/passHostHeader`).value('true').exec();
          let serverUrl = '';
          switch (protocol) {
            case 'tcp':
              serverUrl = listener.info.endpoint;
              break;
            case 'http':
              if (listener.info.protocol === 'ws') {
                const url = new URL(listener.info.endpoint);
                serverUrl = `http://${url.host}`;
              } else {
                serverUrl = listener.info.endpoint;
              }
              break;
          }
          await Com.etcd.lease.put(loadBalancerKey).value(serverUrl).exec();
          break;
        }
        default: {
          if (listener.info) {
            await Com.etcd.client.delete().key(loadBalancerKey).exec();
          }
          break;
        }
      }
    });
  }
}

export {TraefikWorld};
