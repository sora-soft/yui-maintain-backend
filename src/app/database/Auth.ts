import {Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn} from '@sora-soft/database-component/typeorm';
import {UnixTime} from '@sora-soft/framework';
import {AuthGroupId, PermissionResult} from '../account/AccountType.js';
import {Timestamp} from './utility/Type.js';

@Entity({
  engine: 'InnoDB AUTO_INCREMENT=1000',
})
export class AuthGroup {
  constructor(data?: Partial<AuthGroup>) {
    if (!data)
      return;

    Object.entries(data).forEach(([key, value]) => {
      this[key] = value;
    });
  }

  @PrimaryGeneratedColumn('uuid')
  id!: AuthGroupId;

  @Column({
    length: 64,
  })
  name!: string;

  @OneToMany(() => AuthPermission, permission => permission.group)
  @JoinColumn({name: 'id'})
  permissions!: AuthPermission[];

  @Column({
    default: false,
  })
  protected!: boolean;

  @Column({
    transformer: {
      to: (value?: number) => (value ? value : UnixTime.now()),
      from: (value?: number) => value,
    },
  })
  createTime!: Timestamp;
}

@Entity()
export class AuthPermission {
  constructor(data?: Partial<AuthPermission>) {
    if (!data)
      return;

    Object.entries(data).forEach(([key, value]) => {
      this[key] = value;
    });
  }

  @PrimaryColumn('uuid')
  gid!: AuthGroupId;

  @PrimaryColumn({
    length: 64,
  })
  name!: string;

  @Column({
    default: PermissionResult.DENY,
  })
  permission!: PermissionResult;

  @ManyToOne(() => AuthGroup, group => group.permissions)
  @JoinColumn({name: 'gid'})
  group!: AuthGroup;
}
