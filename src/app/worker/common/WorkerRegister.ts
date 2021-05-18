import {DatabaseMigrateCommandWorker} from '../DatabaseMigrateCommandWorker';
import {AuthCommandWorker} from '../AuthCommandWorker';

class WorkerRegister {
  static init() {
    DatabaseMigrateCommandWorker.register();
    AuthCommandWorker.register();
  }
}

export {WorkerRegister};
