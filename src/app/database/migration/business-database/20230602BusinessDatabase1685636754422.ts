import {MigrationInterface, QueryRunner} from '@sora-soft/database-component/typeorm';

export class BusinessDatabase1685636754422 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `config_file` ADD `type` int NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `config_file` DROP COLUMN `type`');
  }
}
