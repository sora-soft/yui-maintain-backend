import {MigrationInterface, QueryRunner} from '@sora-soft/database-component/typeorm';

export class BusinessDatabase1685453606754 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `config_file` (`name` varchar(64) NOT NULL, `context` text NOT NULL, `createTime` int NOT NULL, `updateTime` int NOT NULL, PRIMARY KEY (`name`)) ENGINE=InnoDB');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `config_file`');
  }
}
