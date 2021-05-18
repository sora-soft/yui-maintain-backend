import {Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn} from 'typeorm';
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

  @OneToMany(() => AuthPermission, permission => permission.group)
  @JoinColumn({name: 'id'})
  permissions: AuthPermission[];

  @Column({
    default: false,
  })
  protected: boolean;
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

  @ManyToOne(() => AuthGroup, group => group.permissions)
  @JoinColumn({name: 'gid'})
  group: AuthGroup;
}
