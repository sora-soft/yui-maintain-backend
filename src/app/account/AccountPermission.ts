import {AuthPermission} from '../database/Auth.js';
import {PermissionResult} from './AccountType.js';

class AccountPermission {
  constructor(permissions: AuthPermission[]) {
    this.permissionMap_ = new Map();
    for (const permission of permissions) {
      const existed = this.permissionMap_.get(permission.name);
      if (existed && existed === PermissionResult.ALLOW) {
        continue;
      }
      this.permissionMap_.set(permission.name, permission.permission);
    }
  }

  isAllow(name: string) {
    return this.permissionMap_.get('root') === PermissionResult.ALLOW || this.permissionMap_.get(name) === PermissionResult.ALLOW;
  }

  get list() {
    return [...this.permissionMap_].map(([name, permission]) => {
      return {
        name,
        permission,
      };
    });
  }

  private permissionMap_: Map<string, PermissionResult>;
}

export {AccountPermission};
