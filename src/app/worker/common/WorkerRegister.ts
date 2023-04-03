import {DatabaseMigrateCommandWorker} from '../DatabaseMigrateCommandWorker.js';
import {AuthCommandWorker} from '../AuthCommandWorker.js';
import {MonitorWorker} from '../MonitorWorker.js';

class WorkerRegister {
  static init() {
    DatabaseMigrateCommandWorker.register();
    AuthCommandWorker.register();
    MonitorWorker.register();
  }
}

export {WorkerRegister};
