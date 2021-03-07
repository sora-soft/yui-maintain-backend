import {RedisComponent} from '@sora-soft/redis-component';
import {DatabaseComponent} from '@sora-soft/database-component'
import {Account} from '../app/database/Account';
import {EtcdComponent} from '@sora-soft/etcd-component';

export enum ComponentName {
  AccountRedis = 'account-redis',
  AccountDB = 'account-database',
  Etcd = 'etcd',
}

class Com {
  static accountRedis = new RedisComponent(ComponentName.AccountRedis);

  static accountDB = new DatabaseComponent(ComponentName.AccountDB, [Account]);

  static etcd = new EtcdComponent(ComponentName.Etcd);
}

export {Com}
