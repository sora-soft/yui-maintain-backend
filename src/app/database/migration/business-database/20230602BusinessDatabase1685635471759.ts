import {MigrationInterface, QueryRunner} from '@sora-soft/database-component/typeorm';

export class BusinessDatabase1685635471759 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `config_file` DROP COLUMN `createTime`');
    await queryRunner.query('ALTER TABLE `config_file` ADD `createTime` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');
    await queryRunner.query('ALTER TABLE `config_file` DROP COLUMN `updateTime`');
    await queryRunner.query('ALTER TABLE `config_file` ADD `updateTime` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `config_file` DROP COLUMN `updateTime`');
    await queryRunner.query('ALTER TABLE `config_file` ADD `updateTime` int NOT NULL');
    await queryRunner.query('ALTER TABLE `config_file` DROP COLUMN `createTime`');
    await queryRunner.query('ALTER TABLE `config_file` ADD `createTime` int NOT NULL');
  }
}
