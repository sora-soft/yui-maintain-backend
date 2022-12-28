import {IWorkerOptions, Node, Worker} from '@sora-soft/framework';
import {Com} from '../../lib/Com';
import {RootGroupId} from '../account/AccountType';
import {AccountWorld} from '../account/AccountWorld';
import {WorkerName} from './common/WorkerName';
import * as md5 from 'md5';
import {AssertType, ValidateClass} from 'typescript-is';
import {AppErrorCode} from '../ErrorCode';
import {AppError} from '../AppError';

export interface IAuthCommandWorkerOptions extends IWorkerOptions {
}

@ValidateClass()
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
    await this.connectComponents([Com.businessDB]);
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

        await AccountWorld.createAccount({
          nickname: username,
          email,
          gid: RootGroupId,
        }, {
          username,
          password: md5Password,
        });
        break;
      }
      default: {
        throw new AppError(AppErrorCode.ERR_COMMAND_NOT_FOUND, `ERR_COMMAND_NOT_FOUND`);
      }
    }
    return true;
  }

  private options_: IAuthCommandWorkerOptions;
}

export {AuthCommandWorker}

