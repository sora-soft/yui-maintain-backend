import {MigrationInterface, QueryRunner} from '@sora-soft/database-component/typeorm';

export class BusinessDatabase1689266056880 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `config_file` (`name` varchar(64) NOT NULL, `context` text NOT NULL, `type` int NOT NULL, `createTime` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updateTime` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`name`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `auth_group` (`id` varchar(36) NOT NULL, `name` varchar(64) NOT NULL, `protected` tinyint NOT NULL DEFAULT 0, `createTime` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB AUTO_INCREMENT=1000');
    await queryRunner.query('CREATE TABLE `auth_permission` (`gid` varchar(255) NOT NULL, `name` varchar(64) NOT NULL, `permission` int NOT NULL DEFAULT \'2\', PRIMARY KEY (`gid`, `name`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `account_token` (`session` varchar(255) NOT NULL, `expireAt` int NOT NULL, `accountId` int NOT NULL, `gid` varchar(255) NOT NULL, INDEX `gid_idx` (`gid`), INDEX `expireAt_idx` (`expireAt`), INDEX `accountId_idx` (`accountId`), PRIMARY KEY (`session`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `account_login` (`id` int NOT NULL, `type` int NOT NULL, `username` varchar(64) NOT NULL, `password` varchar(128) NOT NULL, `salt` varchar(64) NOT NULL, UNIQUE INDEX `type_username_idx` (`type`, `username`), PRIMARY KEY (`id`, `type`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `account` (`id` int NOT NULL AUTO_INCREMENT, `nickname` varchar(64) NULL, `avatarUrl` varchar(255) NULL, `gid` varchar(255) NOT NULL, `createTime` int NOT NULL, `disabled` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB AUTO_INCREMENT=1000');
    await queryRunner.query('ALTER TABLE `auth_permission` ADD CONSTRAINT `FK_639efba05169768b15cb2d39a0c` FOREIGN KEY (`gid`) REFERENCES `auth_group`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE `account` ADD CONSTRAINT `FK_f755465c2261b8c7bb1490d535c` FOREIGN KEY (`gid`) REFERENCES `auth_group`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `account` DROP FOREIGN KEY `FK_f755465c2261b8c7bb1490d535c`');
    await queryRunner.query('ALTER TABLE `auth_permission` DROP FOREIGN KEY `FK_639efba05169768b15cb2d39a0c`');
    await queryRunner.query('DROP TABLE `account`');
    await queryRunner.query('DROP INDEX `type_username_idx` ON `account_login`');
    await queryRunner.query('DROP TABLE `account_login`');
    await queryRunner.query('DROP INDEX `accountId_idx` ON `account_token`');
    await queryRunner.query('DROP INDEX `expireAt_idx` ON `account_token`');
    await queryRunner.query('DROP INDEX `gid_idx` ON `account_token`');
    await queryRunner.query('DROP TABLE `account_token`');
    await queryRunner.query('DROP TABLE `auth_permission`');
    await queryRunner.query('DROP TABLE `auth_group`');
    await queryRunner.query('DROP TABLE `config_file`');
  }
}
