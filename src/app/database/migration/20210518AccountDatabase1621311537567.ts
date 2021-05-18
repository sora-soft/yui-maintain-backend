import {MigrationInterface, QueryRunner} from 'typeorm';

export class AccountDatabase1621311537567 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `auth_group` (`updateAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `createAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `version` int NOT NULL, `id` varchar(36) NOT NULL, `name` varchar(64) NOT NULL, `protected` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `auth_permission` (`updateAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `createAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `version` int NOT NULL, `gid` varchar(255) NOT NULL, `name` varchar(64) NOT NULL, `permission` enum (\'1\', \'2\') NOT NULL DEFAULT \'2\', PRIMARY KEY (`gid`, `name`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `user_pass_account` (`updateAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `createAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `version` int NOT NULL, `id` varchar(36) NOT NULL, `username` varchar(64) NOT NULL, `email` varchar(128) NOT NULL, `password` varchar(128) NOT NULL, `salt` varchar(64) NOT NULL, `gid` varchar(255) NOT NULL, UNIQUE INDEX `email_idx` (`email`), UNIQUE INDEX `username_email_idx` (`username`, `email`), UNIQUE INDEX `REL_957db186cd3d41707880568db7` (`gid`), PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('ALTER TABLE `auth_permission` ADD CONSTRAINT `FK_639efba05169768b15cb2d39a0c` FOREIGN KEY (`gid`) REFERENCES `auth_group`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE `user_pass_account` ADD CONSTRAINT `FK_957db186cd3d41707880568db72` FOREIGN KEY (`gid`) REFERENCES `auth_group`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `user_pass_account` DROP FOREIGN KEY `FK_957db186cd3d41707880568db72`');
    await queryRunner.query('ALTER TABLE `auth_permission` DROP FOREIGN KEY `FK_639efba05169768b15cb2d39a0c`');
    await queryRunner.query('DROP INDEX `REL_957db186cd3d41707880568db7` ON `user_pass_account`');
    await queryRunner.query('DROP INDEX `username_email_idx` ON `user_pass_account`');
    await queryRunner.query('DROP INDEX `email_idx` ON `user_pass_account`');
    await queryRunner.query('DROP TABLE `user_pass_account`');
    await queryRunner.query('DROP TABLE `auth_permission`');
    await queryRunner.query('DROP TABLE `auth_group`');
  }
};
