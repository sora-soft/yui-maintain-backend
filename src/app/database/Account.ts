import {Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn} from 'typeorm';
import {IsEmail} from 'class-validator';
import {AccountId, AuthGroupId} from '../account/AccountType';
import {BaseModel} from './base/Base';
import {AuthGroup} from './Auth';

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
  @IsEmail()
  email: string;

  @Column({
    length: 128
  })
  password: string;

  @Column({
    length: 64
  })
  salt: string;

  @OneToOne(() => AuthGroup)
  @JoinColumn({name: 'gid'})
  group: AuthGroup;

  @Column()
  gid: AuthGroupId;
}
