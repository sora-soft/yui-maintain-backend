import {Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn} from '@sora-soft/database-component';
import {IsEmail} from 'class-validator';
import {AccountId, AuthGroupId} from '../account/AccountType';
import {BaseModel} from './base/Base';

@Entity({
  name: 'user_pass_account'
})
@Index(['username', 'email'], { unique: true })
export class Account extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id: AccountId;

  @Column({
    length: 64
  })
  @Index({ unique: true })
  username: string;

  @Column({
    length: 128
  })
  @Index({ unique: true })
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

  @Column()
  gid: AuthGroupId;
}
