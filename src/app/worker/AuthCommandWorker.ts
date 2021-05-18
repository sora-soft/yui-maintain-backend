import {IWorkerOptions, Node, Worker} from '@sora-soft/framework';
import {Com} from '../../lib/Com';
import {RootGroupId} from '../account/AccountType';
import {AccountWorld} from '../account/AccountWorld';
import {WorkerName} from './common/WorkerName';
import * as md5 from 'md5';
import {AssertType} from 'typescript-is';

export interface IAuthCommandWorkerOptions extends IWorkerOptions {
}

class AuthCommandWorker extends Worker {
  static register() {
    Node.registerWorker(WorkerName.AuthCommand, (options: IAuthCommandWorkerOptions) => {
      return new AuthCommandWorker(WorkerName.AuthCommand, options);
    });
  }

  constructor(name: string, @AssertType() options: IAuthCommandWorkerOptions) {
    super(name);
    this.options_ = options;
  }

  protected async startup() {
    await this.connectComponents([Com.accountDB]);
    await AccountWorld.startup();
  }

  protected async shutdown() {
    await AccountWorld.shutdown();
  }

  async runCommand(commands: string[]) {
    const [action] = commands;
    const args= commands.slice(1);

    switch (action) {
      case 'create-root': {
        const [username, password, email] = args;

        const md5Password = md5(password);

        const accInfo = {
          username,
          password: md5Password,
          email,
          gid: RootGroupId,
        };
        await AccountWorld.createAccount(accInfo);
        break;
      }
      default: {
        break;
      }
    }
    return true;
  }

  private options_: IAuthCommandWorkerOptions;
}

export {AuthCommandWorker}

