import {RedisComponent} from '@sora-soft/redis-component';
import {DatabaseComponent} from '@sora-soft/database-component';
import {Account, AccountPassword, AccountToken} from '../app/database/Account';
import {EtcdComponent} from '@sora-soft/etcd-component';
import {AuthGroup, AuthPermission} from '../app/database/Auth';
import {AliCloudComponent} from '../com/alicloud/AliCloudComponent';
import {Runtime} from '@sora-soft/framework';

export enum ComponentName {
  BusinessRedis = 'business-redis',
  BusinessDB = 'business-database',
  Etcd = 'etcd',
  TargetEtcd = 'target-etcd',
  AliCloud = 'ali-cloud',
}

class Com {
  static register() {
    Runtime.registerComponent(ComponentName.BusinessRedis, this.businessRedis);
    Runtime.registerComponent(ComponentName.BusinessDB, this.businessDB);
    Runtime.registerComponent(ComponentName.Etcd, this.etcd);
    Runtime.registerComponent(ComponentName.TargetEtcd, this.targetEtcd);
    Runtime.registerComponent(ComponentName.AliCloud, this.aliCloud);
  }

  static businessRedis = new RedisComponent();

  static businessDB = new DatabaseComponent([
    Account, AccountPassword, AuthGroup, AuthPermission, AccountToken,
  ]);

  static etcd = new EtcdComponent();

  static aliCloud = new AliCloudComponent();

  static targetEtcd = new EtcdComponent();
}

export {Com};
