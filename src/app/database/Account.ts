import {Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, PrimaryGeneratedColumn} from 'typeorm';
import {IsEmail} from 'class-validator';
import {AccountId, AuthGroupId} from '../account/AccountType';
import {AuthGroup} from './Auth';
import {Timestamp} from './Type';

@Entity()
@Index('username_idx', ['username'], { unique: true })
export class AccountPassword {
  constructor(data?: Partial<AccountPassword>) {
    if (!data)
      return;

    Object.entries(data).forEach(([key, value]) => {
      this[key] = value;
    });
  }

  @PrimaryColumn()
  id: AccountId;

  @Column({ length: 64 })
  username: string;

  @Column({ length: 128 })
  password: string;

  @Column({ length: 64 })
  salt: string;
}

@Entity({
  name: 'user_account',
  engine: 'InnoDB AUTO_INCREMENT=1000',
})
@Index('nickname_idx', ['nickname'], { unique: true })
@Index('email_idx', ['email'], { unique: true })
export class Account {
    constructor(data?: Partial<Account>) {
    if (!data)
      return;

    Object.entries(data).forEach(([key, value]) => {
      this[key] = value;
    });
  }

  @PrimaryGeneratedColumn()
  id: AccountId;

  @Column({ length: 64 })
  nickname: string;

  @Column({ length: 128 })
  @IsEmail()
  email: string;

  @OneToOne(() => AccountPassword, pass => pass.id, {createForeignKeyConstraints: false})
  @JoinColumn({name: 'id'})
  userPass: AccountPassword;

  @ManyToOne(() => AuthGroup)
  @JoinColumn({name: 'gid'})
  group: AuthGroup;

  @Column()
  gid: AuthGroupId;

  @Column()
  createTime: Timestamp;
}
