import {Com} from '../lib/Com.js';
import {AccountLoginType} from './account/AccountType.js';

export class EtcdKey {
  static traefikConfigServiceUrl(prefix: string, protocol: string, name: string, index: string) {
    return `${prefix}/${protocol}/services/${name}/loadBalancer/servers/${index}/url`;
  }

  static sessionNotify(sessionId: string, notifyName: string) {
    return `${this.notifyName(notifyName)}/${sessionId}`;
  }

  static notifyName(notifyName: string) {
    return Com.etcd.keys('notify', notifyName);
  }
}

export class RedisKey {
  static accountRegisterLock(type: AccountLoginType, username: string) {
    return `lock:account-register:${type}:${username}`;
  }

  static accountSession(session: string) {
    return `account-session:${session}`;
  }

  static resetPasswordCode(code: string) {
    return `code:${code}:reset-password-code`;
  }

  static targetClusterNodeRunData(scope: string) {
    return `target-cluster:${scope}:node-run-data`;
  }

  static targetClusterNodeMetaData(scope: string) {
    return `target-cluster:${scope}:node-meta-data`;
  }

  static targetClusterServiceMetaData(scope: string) {
    return `target-cluster:${scope}:service-meta-data`;
  }

  static targetClusterWorkerMetaData(scope: string) {
    return `target-cluster:${scope}:worker-meta-data`;
  }

  static targetClusterListenerMetaData(scope: string) {
    return `target-cluster:${scope}:listener-meta-data`;
  }
}
