import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { publishBbvaDataChange } from '../lib/bbvaDataSync';
import * as api from '../api/adminUserApi';
import type { AdminRolePayload, AdminStatus, AdminUserPayload } from '../types/adminUser';

const usersKey=['bbva-admin-users'] as const; const rolesKey=['bbva-admin-roles'] as const;
export const useAdminUsers=(query:api.AdminListQuery)=>useQuery({queryKey:[...usersKey,query],queryFn:()=>api.listAdminUsers(query)});
export const useAdminUser=(id?:string)=>useQuery({queryKey:[...usersKey,'item',id],queryFn:()=>api.getAdminUser(id!),enabled:Boolean(id)});
export const useDeliveryManagers=()=>useQuery({queryKey:[...usersKey,'dm-options'],queryFn:api.listDeliveryManagerOptions,staleTime:30_000});
export const useAdminRoles=(query:api.AdminListQuery)=>useQuery({queryKey:[...rolesKey,query],queryFn:()=>api.listAdminRoles(query)});
export const useAdminRole=(id?:string)=>useQuery({queryKey:[...rolesKey,'item',id],queryFn:()=>api.getAdminRole(id!),enabled:Boolean(id)});
export const useAdminRoleOptions=()=>useQuery({queryKey:[...rolesKey,'options'],queryFn:api.listAdminRoleOptions,staleTime:30_000});
function invalidate(client:ReturnType<typeof useQueryClient>){void client.invalidateQueries({queryKey:usersKey});void client.invalidateQueries({queryKey:rolesKey});publishBbvaDataChange(['admin-users']);}
export function useCreateAdminUser(){const c=useQueryClient();return useMutation({mutationFn:(p:AdminUserPayload)=>api.createAdminUser(p),onSuccess:()=>invalidate(c)});}
export function useUpdateAdminUser(){const c=useQueryClient();return useMutation({mutationFn:({id,payload}:{id:string;payload:AdminUserPayload})=>api.updateAdminUser(id,payload),onSuccess:()=>invalidate(c)});}
export function useUpdateAdminUserStatus(){const c=useQueryClient();return useMutation({mutationFn:({id,status}:{id:string;status:AdminStatus})=>api.updateAdminUserStatus(id,status),onSuccess:()=>invalidate(c)});}
export function useDeleteAdminUser(){const c=useQueryClient();return useMutation({mutationFn:api.deleteAdminUser,onSuccess:()=>invalidate(c)});}
export function useCreateAdminRole(){const c=useQueryClient();return useMutation({mutationFn:(p:AdminRolePayload)=>api.createAdminRole(p),onSuccess:()=>invalidate(c)});}
export function useUpdateAdminRole(){const c=useQueryClient();return useMutation({mutationFn:({id,payload}:{id:string;payload:AdminRolePayload})=>api.updateAdminRole(id,payload),onSuccess:()=>invalidate(c)});}
export function useUpdateAdminRoleStatus(){const c=useQueryClient();return useMutation({mutationFn:({id,status}:{id:string;status:AdminStatus})=>api.updateAdminRoleStatus(id,status),onSuccess:()=>invalidate(c)});}
export function useDeleteAdminRole(){const c=useQueryClient();return useMutation({mutationFn:api.deleteAdminRole,onSuccess:()=>invalidate(c)});}
