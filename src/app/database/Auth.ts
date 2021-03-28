import {Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn} from '@sora-soft/database-component';
import {AuthGroupId, PermissionResult} from '../account/AccountType';
import {BaseModel} from './base/Base';

@Entity()
export class AuthGroup extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id: AuthGroupId;

  @Column({
    length: 64
  })
  name: string;
}

@Entity()
export class AuthPermission extends BaseModel {
  @PrimaryColumn()
  gid: AuthGroupId;

  @PrimaryColumn({
    length: 64
  })
  name: string;

  @Column({
    type: 'enum',
    enum: [PermissionResult.ALLOW, PermissionResult.DENY],
    default: PermissionResult.DENY,
  })
  permission: PermissionResult;
}
