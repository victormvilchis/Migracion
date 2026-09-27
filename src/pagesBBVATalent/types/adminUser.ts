export type AdminStatus = 'ACTIVE' | 'INACTIVE';

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isDeliveryManager: boolean;
  isSystem: boolean;
  status: AdminStatus;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserRoleRef {
  id: string;
  code: string;
  name: string;
  isDeliveryManager: boolean;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string | null;
  corporateUser: string | null;
  softtekCode: string | null;
  status: AdminStatus;
  roles: AdminUserRoleRef[];
  collaboratorCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserOption {
  id: string;
  fullName: string;
  email: string | null;
  corporateUser: string | null;
  softtekCode: string | null;
}

export interface AdminPage<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface AdminUserPayload {
  fullName: string;
  email: string;
  corporateUser: string;
  softtekCode: string;
  roleIds: string[];
}

export interface AdminRolePayload {
  code: string;
  name: string;
  description: string;
  isDeliveryManager: boolean;
}
