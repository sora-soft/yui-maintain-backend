import {Column, Entity, PrimaryGeneratedColumn} from '@sora-soft/database-component';
import {IsEmail} from 'class-validator';
import {AccountId} from '../account/AccountType';

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id: AccountId;

  @Column({
    length: 64
  })
  username: string;

  @Column({
    length: 128
  })
  password: string;

  @Column({
    length: 128
  })
  @IsEmail()
  email: string;

  @Column({
    default: 'user',
    length: 64
  })
  group: string;
}
