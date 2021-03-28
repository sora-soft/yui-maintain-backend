import {DatabaseComponent, IDatabaseComponentOptions, Migration, MigrationExecutor} from '@sora-soft/database-component';
import {IWorkerOptions, Node, Runtime, Worker} from '@sora-soft/framework';
import {createConnection} from 'typeorm';
import {ComponentName} from '../../lib/Com';
import {Application} from '../Application';
import {Migrations} from '../database/migration';
import {WorkerName} from './common/WorkerName';

export interface IDatabaseMigrateWorkerOptions extends IWorkerOptions {
  components: ComponentName[];
}

class DatabaseMigrateWorker extends Worker {
  static register() {
    Node.registerWorker(WorkerName.DatabaseMigrate, (options: IDatabaseMigrateWorkerOptions) => {
      return new DatabaseMigrateWorker(WorkerName.DatabaseMigrate, options);
    });
  }

  constructor(name: string, options: IDatabaseMigrateWorkerOptions) {
    super(name);
    this.options_ = options;
  }

  protected async startup() {}

  protected async shutdown() {}

  async runCommand(commands: string[]) {
    const [action] = commands;

    switch (action) {
      case 'sync': {
        for (const name of this.options_.components) {
          const component = Runtime.getComponent(name) as DatabaseComponent;
          const options = component.options as IDatabaseComponentOptions;

          Application.appLog.info('worker.database-migrate', { component: name });
          const connection = await createConnection({
            ...options.database,
            entities: component.entities,
            synchronize: true,
          });

          await connection.close();
        }
        break;
      }
      case 'migrate': {
        const [_, componentName, migrations] = commands;
        const component = Runtime.getComponent(componentName) as DatabaseComponent;
        const options = component.options as IDatabaseComponentOptions;
        const list = migrations.split(',').map((name) => {
          return Migrations[name];
        });

        const connection = await createConnection({
          ...options.database,
          entities: component.entities,
          migrationsRun: false,
          migrations: list
        });

        await connection.runMigrations({
          transaction: 'each'
        });

        await connection.close();
        break;
      }

      case 'revert': {
        const [_, componentName] = commands;

        const component = Runtime.getComponent(componentName) as DatabaseComponent;
        const options = component.options as IDatabaseComponentOptions;

        const connection = await createConnection({
          ...options.database,
          entities: component.entities,
          migrations: Object.entries(Migrations).map(([key, value]) => value),
        });

        await connection.undoLastMigration();

        await connection.close();
        break;
      }

      case 'drop': {
        const [_, componentName] = commands;
        const component = Runtime.getComponent(componentName) as DatabaseComponent;
        const options = component.options as IDatabaseComponentOptions;

        const connection = await createConnection({
          ...options.database,
          entities: component.entities,
        });

        await connection.dropDatabase();
        await connection.close();
        break;
      }
      default:
        break;
    }
    return true;
  }

  private options_: IDatabaseMigrateWorkerOptions;
}

export {DatabaseMigrateWorker}
