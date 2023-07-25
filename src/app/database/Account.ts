import {Column, Entity, Index, JoinTable, ManyToMany, PrimaryColumn, PrimaryGeneratedColumn} from '@sora-soft/database-component/typeorm';
import {AccountId, AccountLoginType, AuthGroupId} from '../account/AccountType.js';
import {Timestamp} from './utility/Type.js';
import {AuthGroup} from './Auth.js';

@Entity()
@Index('accountId_idx', ['accountId'])
@Index('expireAt_idx', ['expireAt'])
export class AccountToken {
  constructor(data?: Partial<AccountToken>) {
    if (!data)
      return;

    Object.entries(data).forEach(([key, value]) => {
      this[key] = value;
    });
  }

  @PrimaryColumn()
  session!: string;

  @Column()
  expireAt!: Timestamp;

  @Column()
  accountId!: AccountId;
}

@Entity()
@Index('type_username_idx', ['type', 'username'], {unique: true})
export class AccountLogin {
  constructor(data?: Partial<AccountLogin>) {
    if (!data)
      return;

    Object.entries(data).forEach(([key, value]) => {
      this[key] = value;
    });
  }

  @PrimaryColumn()
  id!: AccountId;

  @PrimaryColumn()
  type!: AccountLoginType;

  @Column({length: 64})
  username!: string;

  @Column({length: 128})
  password!: string;

  @Column({length: 64})
  salt!: string;
}

@Entity({
  engine: 'InnoDB AUTO_INCREMENT=1000',
})
export class Account {
  constructor(data?: Partial<Account>) {
    if (!data)
      return;

    Object.entries(data).forEach(([key, value]) => {
      this[key] = value;
    });
  }

  @PrimaryGeneratedColumn()
  id!: AccountId;

  @Column({length: 64, nullable: true})
  nickname?: string;

  @Column({nullable: true})
  avatarUrl?: string;

  @ManyToMany(() => AuthGroup)
  @JoinTable({
    name: 'account_auth_group',
    joinColumn: {
      name: 'accountId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'groupId',
      referencedColumnName: 'id',
    },
  })
  groupList?: AuthGroup[];

  @Column()
  createTime!: Timestamp;

  @Column({default: false})
  disabled!: boolean;
}

@Entity()
export class AccountAuthGroup {
  constructor(data?: Partial<AccountAuthGroup>) {
    if (!data)
      return;

    Object.entries(data).forEach(([key, value]) => {
      this[key] = value;
    });
  }

  @PrimaryColumn()
  accountId!: AccountId;

  @PrimaryColumn({
    length: 36,
  })
  groupId!: AuthGroupId;
}
