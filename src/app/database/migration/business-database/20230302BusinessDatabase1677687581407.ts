import {MigrationInterface, QueryRunner} from '@sora-soft/database-component/typeorm';

export class BusinessDatabase1677687581407 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `account_token` (`session` varchar(255) NOT NULL, `expireAt` int NOT NULL, `accountId` int NOT NULL, `gid` varchar(255) NOT NULL, INDEX `gid_idx` (`gid`), INDEX `expireAt_idx` (`expireAt`), INDEX `accountId_idx` (`accountId`), PRIMARY KEY (`session`)) ENGINE=InnoDB');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `accountId_idx` ON `account_token`');
    await queryRunner.query('DROP INDEX `expireAt_idx` ON `account_token`');
    await queryRunner.query('DROP INDEX `gid_idx` ON `account_token`');
    await queryRunner.query('DROP TABLE `account_token`');
  }
}
