import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn} from 'typeorm';
import {UnixTime} from '../../lib/Utility';
import {AuthGroupId, PermissionResult} from '../account/AccountType';
import {Timestamp} from './Type';

@Entity({
  engine: 'InnoDB AUTO_INCREMENT=1000'
})
export class AuthGroup {
  @PrimaryGeneratedColumn()
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

  @Column({
    transformer: {
      to: (value?: number) => (value ? value : UnixTime.now()),
      from: (value?: number) => value,
    }
  })
  createTime: Timestamp;
}

@Entity()
export class AuthPermission {
  @PrimaryColumn()
  gid: AuthGroupId;

  @PrimaryColumn({
    length: 64
  })
  name: string;

  @Column({
    default: PermissionResult.DENY,
  })
  permission: PermissionResult;

  @ManyToOne(() => AuthGroup, group => group.permissions)
  @JoinColumn({name: 'gid'})
  group: AuthGroup;
}
