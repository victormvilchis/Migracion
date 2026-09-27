export type BbvaAdminStatus = 'ACTIVE' | 'INACTIVE';

export interface BbvaSystemRoleRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isDeliveryManager: boolean;
  isSystem: boolean;
  status: BbvaAdminStatus;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BbvaSystemUserRoleRef {
  id: string;
  code: string;
  name: string;
  isDeliveryManager: boolean;
}

export interface BbvaSystemUserRecord {
  id: string;
  fullName: string;
  email: string | null;
  corporateUser: string | null;
  softtekCode: string | null;
  status: BbvaAdminStatus;
  roles: BbvaSystemUserRoleRef[];
  collaboratorCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BbvaSystemUserOption {
  id: string;
  fullName: string;
  email: string | null;
  corporateUser: string | null;
  softtekCode: string | null;
}

export interface BbvaSystemUserPayload {
  fullName: string;
  email: string | null;
  corporateUser: string | null;
  softtekCode: string | null;
  roleIds: string[];
}

export interface BbvaSystemRolePayload {
  code: string;
  name: string;
  description: string | null;
  isDeliveryManager: boolean;
}

export interface BbvaAdminListParams {
  search?: string;
  status?: BbvaAdminStatus | 'ALL';
  page?: number;
  size?: number;
}

export interface BbvaAdminPage<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}
