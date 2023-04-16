import {LifeCycleEvent, Listener, ListenerState} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {EtcdKey} from '../Keys.js';

class TraefikWorld {
  static registerTraefikListener(prefix: string, protocol: string, name: string, listener: Listener) {

    listener.stateEventEmitter.on(LifeCycleEvent.StateChangeTo, async () => {
      await this.updateTraefikListener(prefix, protocol, name, listener);
    });
  }

  static async updateTraefikListener(prefix: string, protocol: string, name: string, listener: Listener) {
    if (!listener.info)
      return;

    const loadBalancerKey = EtcdKey.traefikConfigServiceUrl(prefix, protocol, name, listener.id);

    switch(listener.state) {
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
  }
}

export {TraefikWorld};
