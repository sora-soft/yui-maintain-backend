import {RedisComponent} from '@sora-soft/redis-component';
import {DatabaseComponent} from '@sora-soft/database-component'
import {Account, AccountPassword} from '../app/database/Account';
import {EtcdComponent} from '@sora-soft/etcd-component';
import {AuthGroup, AuthPermission} from '../app/database/Auth';
import {AliCloudComponent} from '../com/alicloud/AliCloudComponent';

export enum ComponentName {
  BusinessRedis = 'business-redis',
  BusinessDB = 'business-database',
  Etcd = 'etcd',
  AliCloud = 'ali-cloud',
}

class Com {
  static businessRedis = new RedisComponent(ComponentName.BusinessRedis);

  static businessDB = new DatabaseComponent(ComponentName.BusinessDB, [
    Account, AccountPassword, AuthGroup, AuthPermission,
  ]);

  static etcd = new EtcdComponent(ComponentName.Etcd);

  static aliCloud = new AliCloudComponent(ComponentName.AliCloud);

}

export {Com}
