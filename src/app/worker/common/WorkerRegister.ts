import {DatabaseMigrateCommandWorker} from '../DatabaseMigrateCommandWorker.js';
import {AuthCommandWorker} from '../AuthCommandWorker.js';

class WorkerRegister {
  static init() {
    DatabaseMigrateCommandWorker.register();
    AuthCommandWorker.register();
  }
}

export {WorkerRegister};
