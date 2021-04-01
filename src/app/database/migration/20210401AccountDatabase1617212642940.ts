import {MigrationInterface, QueryRunner} from 'typeorm';

export class AccountDatabase1617212642940 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `user_pass_account` (`updateAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `createAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `version` int NOT NULL, `id` varchar(36) NOT NULL, `username` varchar(64) NOT NULL, `email` varchar(128) NOT NULL, `password` varchar(128) NOT NULL, `salt` varchar(64) NOT NULL, `gid` varchar(255) NOT NULL, `test` varchar(255) NOT NULL, UNIQUE INDEX `email_idx` (`email`), UNIQUE INDEX `username_email_idx` (`username`, `email`), PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `auth_group` (`updateAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `createAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `version` int NOT NULL, `id` varchar(36) NOT NULL, `name` varchar(64) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `auth_permission` (`updateAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `createAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `version` int NOT NULL, `gid` varchar(255) NOT NULL, `name` varchar(64) NOT NULL, `permission` enum (\'1\', \'2\') NOT NULL DEFAULT \'2\', PRIMARY KEY (`gid`, `name`)) ENGINE=InnoDB');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `auth_permission`');
    await queryRunner.query('DROP TABLE `auth_group`');
    await queryRunner.query('DROP INDEX `username_email_idx` ON `user_pass_account`');
    await queryRunner.query('DROP INDEX `email_idx` ON `user_pass_account`');
    await queryRunner.query('DROP TABLE `user_pass_account`');
  }
};
