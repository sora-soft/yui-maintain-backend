import {DatabaseMigrateWorker} from '../DatabaseMigrateWorker';

class WorkerRegister {
  static init() {
    DatabaseMigrateWorker.register();
  }
}

export {WorkerRegister};
