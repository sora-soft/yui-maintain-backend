import {MigrationInterface, QueryRunner} from '@sora-soft/database-component';

export class BusinessDatabase1671965184976 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `auth_group` (`id` varchar(36) NOT NULL, `name` varchar(64) NOT NULL, `protected` tinyint NOT NULL DEFAULT 0, `createTime` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB AUTO_INCREMENT=1000');
    await queryRunner.query('CREATE TABLE `auth_permission` (`gid` varchar(255) NOT NULL, `name` varchar(64) NOT NULL, `permission` int NOT NULL DEFAULT \'2\', PRIMARY KEY (`gid`, `name`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `account_password` (`id` int NOT NULL, `username` varchar(64) NOT NULL, `password` varchar(128) NOT NULL, `salt` varchar(64) NOT NULL, UNIQUE INDEX `username_idx` (`username`), PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `user_account` (`id` int NOT NULL AUTO_INCREMENT, `nickname` varchar(64) NOT NULL, `email` varchar(128) NOT NULL, `gid` varchar(255) NOT NULL, `createTime` int NOT NULL, UNIQUE INDEX `email_idx` (`email`), UNIQUE INDEX `nickname_idx` (`nickname`), PRIMARY KEY (`id`)) ENGINE=InnoDB AUTO_INCREMENT=1000');
    await queryRunner.query('ALTER TABLE `auth_permission` ADD CONSTRAINT `FK_639efba05169768b15cb2d39a0c` FOREIGN KEY (`gid`) REFERENCES `auth_group`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE `user_account` ADD CONSTRAINT `FK_0ba9cd9e86a125035f831f2493f` FOREIGN KEY (`gid`) REFERENCES `auth_group`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `user_account` DROP FOREIGN KEY `FK_0ba9cd9e86a125035f831f2493f`');
    await queryRunner.query('ALTER TABLE `auth_permission` DROP FOREIGN KEY `FK_639efba05169768b15cb2d39a0c`');
    await queryRunner.query('DROP INDEX `nickname_idx` ON `user_account`');
    await queryRunner.query('DROP INDEX `email_idx` ON `user_account`');
    await queryRunner.query('DROP TABLE `user_account`');
    await queryRunner.query('DROP INDEX `username_idx` ON `account_password`');
    await queryRunner.query('DROP TABLE `account_password`');
    await queryRunner.query('DROP TABLE `auth_permission`');
    await queryRunner.query('DROP TABLE `auth_group`');
  }
};
