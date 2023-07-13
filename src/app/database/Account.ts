import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn} from '@sora-soft/database-component/typeorm';
import {AccountId, AccountLoginType, AuthGroupId} from '../account/AccountType.js';
import {AuthGroup} from './Auth.js';
import {Timestamp} from './utility/Type.js';

@Entity()
@Index('accountId_idx', ['accountId'])
@Index('expireAt_idx', ['expireAt'])
@Index('gid_idx', ['gid'])
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

  @Column()
  gid!: AuthGroupId;
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

  @ManyToOne(() => AuthGroup)
  @JoinColumn({name: 'gid'})
  group?: AuthGroup;

  @Column()
  gid!: AuthGroupId;

  @Column()
  createTime!: Timestamp;

  @Column({default: false})
  disabled!: boolean;
}
