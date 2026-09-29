import { fetchApi } from '../../lib/api';
import type { AdminPage, AdminRole, AdminRolePayload, AdminStatus, AdminUser, AdminUserOption, AdminUserPayload } from '../types/adminUser';

export interface AdminListQuery { search?: string; status?: AdminStatus | 'ALL'; page?: number; size?: number; sort?: string; direction?: 'asc'|'desc'; }
function qs(query:AdminListQuery){const p=new URLSearchParams();if(query.search)p.set('search',query.search);p.set('status',query.status??'ACTIVE');p.set('page',String(query.page??0));p.set('size',String(query.size??10));if(query.sort)p.set('sort',query.sort);if(query.direction)p.set('direction',query.direction);return p.toString();}

export const listAdminUsers=(query:AdminListQuery)=>fetchApi<AdminPage<AdminUser>>(`/bbva/admin/users?${qs(query)}`);
export const getAdminUser=(id:string)=>fetchApi<{item:AdminUser}>(`/bbva/admin/users/${id}`);
export const createAdminUser=(payload:AdminUserPayload)=>fetchApi<{item:AdminUser}>('/bbva/admin/users',{method:'POST',body:JSON.stringify(payload)});
export const updateAdminUser=(id:string,payload:AdminUserPayload)=>fetchApi<{item:AdminUser}>(`/bbva/admin/users/${id}`,{method:'PUT',body:JSON.stringify(payload)});
export const updateAdminUserStatus=(id:string,status:AdminStatus)=>fetchApi<{item:AdminUser}>(`/bbva/admin/users/${id}/status`,{method:'PATCH',body:JSON.stringify({status})});
export const deleteAdminUser=(id:string)=>fetchApi<{deleted:boolean}>(`/bbva/admin/users/${id}`,{method:'DELETE'});
export const listDeliveryManagerOptions=()=>fetchApi<{items:AdminUserOption[]}>('/bbva/admin/user-options/delivery-managers');

export const listAdminRoles=(query:AdminListQuery)=>fetchApi<AdminPage<AdminRole>>(`/bbva/admin/roles?${qs(query)}`);
export const getAdminRole=(id:string)=>fetchApi<{item:AdminRole}>(`/bbva/admin/roles/${id}`);
export const listAdminRoleOptions=()=>fetchApi<{items:AdminRole[]}>('/bbva/admin/role-options');
export const createAdminRole=(payload:AdminRolePayload)=>fetchApi<{item:AdminRole}>('/bbva/admin/roles',{method:'POST',body:JSON.stringify(payload)});
export const updateAdminRole=(id:string,payload:AdminRolePayload)=>fetchApi<{item:AdminRole}>(`/bbva/admin/roles/${id}`,{method:'PUT',body:JSON.stringify(payload)});
export const updateAdminRoleStatus=(id:string,status:AdminStatus)=>fetchApi<{item:AdminRole}>(`/bbva/admin/roles/${id}/status`,{method:'PATCH',body:JSON.stringify({status})});
export const deleteAdminRole=(id:string)=>fetchApi<{deleted:boolean}>(`/bbva/admin/roles/${id}`,{method:'DELETE'});
