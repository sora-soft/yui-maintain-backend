import {DatabaseComponent, IDatabaseComponentOptions} from '@sora-soft/database-component';
import {IWorkerOptions, Node, Runtime, Worker} from '@sora-soft/framework';
import {createConnection} from 'typeorm';
import {MysqlDriver} from 'typeorm/driver/mysql/MysqlDriver';
import {ComponentName} from '../../lib/Com';
import {Application} from '../Application';
import {WorkerName} from './common/WorkerName';
import camelcase = require('camelcase');
import fs = require('fs/promises');
import path = require('path');
import moment = require('moment');
import {UserError} from '../UserError';
import {UserErrorCode} from '../ErrorCode';

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
      case 'generate': {
        const projectPath = path.resolve(__dirname, '../../../');
        const soraConfig = require(`${projectPath}/sora.json`);
        const migrationPath = soraConfig.migration;
        for (const name of this.options_.components) {
          const component = Runtime.getComponent(name) as DatabaseComponent;
          const options = component.options as IDatabaseComponentOptions;

          Application.appLog.info('worker.generate-migrate', { component: name });
          const connection = await createConnection({
            ...options.database,
            entities: component.entities,
          });

          const sqlInMemory = await connection.driver.createSchemaBuilder().log();
          const upSqls: string[] = [];
          const downSqls: string[] = [];

          // mysql is exceptional here because it uses ` character in to escape names in queries, that's why for mysql
          // we are using simple quoted string instead of template string syntax
          if (connection.driver instanceof MysqlDriver) {
            sqlInMemory.upQueries.forEach(query => {
              upSqls.push('    await queryRunner.query(\'' + query.query.replace(new RegExp(`'`, 'g'), `\\'`) + '\');');
            });
            sqlInMemory.downQueries.forEach(query => {
              downSqls.push('    await queryRunner.query(\'' + query.query.replace(new RegExp(`'`, 'g'), `\\'`) + '\');');
            });
          } else {
            sqlInMemory.upQueries.forEach(query => {
              upSqls.push('    await queryRunner.query(`' + query.query.replace(new RegExp('`', 'g'), '\\`') + '`);');
            });
            sqlInMemory.downQueries.forEach(query => {
              downSqls.push('    await queryRunner.query(`' + query.query.replace(new RegExp('`', 'g'), '\\`') + '`);');
            });
          }

          if (upSqls.length || downSqls.length) {
            const className = camelcase(name, {pascalCase: true}) + Date.now();
            const file =
`import {MigrationInterface, QueryRunner} from 'typeorm';

export class ${className} implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
${upSqls.join('\n')}
  }

  async down(queryRunner: QueryRunner): Promise<void> {
${downSqls.reverse().join('\n')}
  }
};
`
            await fs.writeFile(path.resolve(projectPath, soraConfig.root, migrationPath, moment().format('YYYYMMDD') + className + '.ts'), file);
          }

          await connection.close();
        }

        break;
      }
      case 'sync': {
        for (const name of this.options_.components) {
          const component = Runtime.getComponent(name) as DatabaseComponent;
          const options = component.options as IDatabaseComponentOptions;

          Application.appLog.info('worker.database-migrate', { event: 'sync-database', component: name });
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
        const [_, componentName, migration] = commands;
        if (!componentName) {
          Application.appLog.fatal('worker.database-migrate', new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID`), 'Component name needed');
          return false;
        }

        if (!migration) {
          Application.appLog.fatal('worker.database-migrate', new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID`), 'Migration name needed');
          return false;
        }

        const component = Runtime.getComponent(componentName) as DatabaseComponent;
        if (!component) {
          Application.appLog.fatal('worker.database-migrate', new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID`), 'Component not found');
          return false;
        }

        const options = component.options as IDatabaseComponentOptions;
        const projectPath = path.resolve(__dirname, '../../../');
        const soraConfig = require(`${projectPath}/sora.json`);
        const migrationPath = path.resolve(projectPath, soraConfig.dist, soraConfig.migration);

        const connection = await createConnection({
          ...options.database,
          entities: component.entities,
          migrationsRun: false,
          migrations: [path.join(migrationPath, `${migration}.js`)]
        });

        await connection.runMigrations({
          transaction: 'each'
        });

        await connection.close();
        break;
      }

      case 'revert': {
        const [_, componentName] = commands;
        if (!componentName) {
          Application.appLog.fatal('worker.database-migrate', new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID`), 'Component name needed');
          return false;
        }

        const component = Runtime.getComponent(componentName) as DatabaseComponent;
        if (!component) {
          Application.appLog.fatal('worker.database-migrate', new UserError(UserErrorCode.ERR_PARAMETERS_INVALID, `ERR_PARAMETERS_INVALID`), 'Component not found');
          return false;
        }

        const options = component.options as IDatabaseComponentOptions;

        const projectPath = path.resolve(__dirname, '../../../');
        const soraConfig = require(`${projectPath}/sora.json`);
        const migrationPath = path.resolve(projectPath, soraConfig.dist, soraConfig.migration);

        const connection = await createConnection({
          ...options.database,
          entities: component.entities,
          migrations: [path.join(migrationPath, '*.js')],
        });

        await connection.undoLastMigration({
          transaction: 'each'
        });

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
