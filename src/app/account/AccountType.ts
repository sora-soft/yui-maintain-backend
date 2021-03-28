import {AuthGroup, AuthPermission} from '../database/Auth';

export type AccountId = string;

export interface IAccountSessionData {
  accountId: AccountId;
  gid: AuthGroupId;
}

export type AuthGroupId = string;

export enum PermissionResult {
  ALLOW = 1,
  DENY = 2,
}

// 默认游客 gid
export const GuestGroupId = 'd36a956b-7494-480c-8bd9-66b77c89a38c';

// 注册用户
export const UserGroupId = 'ebba2b40-25b3-4178-8c8a-6a6eca2def99';

// 注册用户组别
export const DefaultGroupList: Partial<AuthGroup>[] = [
  {
    id: UserGroupId,
    name: 'User',
  }
];

// 默认游客权限
export const DefaultPermissionList: Partial<AuthPermission>[] = [];
