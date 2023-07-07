import {AccountLoginType} from './account/AccountType.js';

export class EtcdKey {
  static traefikConfigServiceUrl(prefix: string, protocol: string, name: string, index: string) {
    return `${prefix}/${protocol}/services/${name}/loadBalancer/servers/${index}/url`;
  }
}

export class RedisKey {
  static accountRegisterLock(type: AccountLoginType, username: string) {
    return `lock:account-register:${type}:${username}`;
  }

  static tarotAnswerLock(id: string) {
    return `lock:tarot-answer:${id}`;
  }

  static accountSession(session: string) {
    return `account-session:${session}`;
  }

  static resetPasswordCode(code: string) {
    return `code:${code}:reset-password-code`;
  }

  static suggestionQuestions() {
    return 'tarot:suggestion-questions:list';
  }
}
