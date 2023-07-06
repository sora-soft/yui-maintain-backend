import {Listener, ListenerState} from '@sora-soft/framework';
import {Com} from '../../lib/Com.js';
import {EtcdKey} from '../Keys.js';
import {ExError} from '@sora-soft/framework';
import {Application} from '../Application.js';
import {Logger} from '@sora-soft/framework';

class TraefikWorld {
  static registerTraefikListener(prefix: string, protocol: string, name: string, listener: Listener) {
    listener.stateSubject.subscribe(() => {
      this.updateTraefikListener(prefix, protocol, name, listener).catch((err: ExError) => {
        Application.appLog.error('traefik', err, {event: 'update-traefik-listener', error: Logger.errorMessage(err)});
      });
    });
  }

  static async updateTraefikListener(prefix: string, protocol: string, name: string, listener: Listener) {
    if (!listener.info)
      return;

    const loadBalancerKey = EtcdKey.traefikConfigServiceUrl(prefix, protocol, name, listener.id);

    switch(listener.state) {
      case ListenerState.READY: {
        await Com.etcd.persistPut(`${prefix}/${protocol}/services/${name}/loadBalancer/passHostHeader`, 'true');
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
        await Com.etcd.persistPut(loadBalancerKey, serverUrl);
        break;
      }
      default: {
        if (listener.info) {
          await Com.etcd.persistDel(loadBalancerKey);
        }
        break;
      }
    }
  }
}

export {TraefikWorld};
