import {Com} from '../lib/Com.js';
import {AccountType} from '../lib/Enum.js';

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
  static accountRegisterUsernameLock(type: AccountType, username: string) {
    return `lock:account-register:${type}:username:${username}`;
  }

  static accountRegisterEmailLock(type: AccountType, email: string) {
    return `lock:account-register:${type}:email:${email}`;
  }

  static accountRegisterNicknameLock(type: AccountType, nickname: string) {
    return `lock:account-register:${type}:nickname:${nickname}`;
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
