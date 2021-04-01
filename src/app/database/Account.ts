import {Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn} from '@sora-soft/database-component';
import {IsEmail} from 'class-validator';
import {AccountId, AuthGroupId} from '../account/AccountType';
import {BaseModel} from './base/Base';

@Entity({
  name: 'user_pass_account'
})
@Index('username_email_idx', ['username', 'email'], { unique: true })
@Index('email_idx', ['email'], { unique: true })
export class Account extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id: AccountId;

  @Column({
    length: 64
  })
  username: string;

  @Column({
    length: 128
  })
  // @IsEmail()
  email: string;

  @Column({
    length: 128
  })
  password: string;

  @Column({
    length: 64
  })
  salt: string;

  @Column()
  gid: AuthGroupId;

  @Column()
  test: string;
}
