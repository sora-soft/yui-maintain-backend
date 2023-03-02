import {MigrationInterface, QueryRunner} from '@sora-soft/database-component';

export class BusinessDatabase1677766529947 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `user_account` ADD `disabled` tinyint NOT NULL DEFAULT 0');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `user_account` DROP COLUMN `disabled`');
  }
};
