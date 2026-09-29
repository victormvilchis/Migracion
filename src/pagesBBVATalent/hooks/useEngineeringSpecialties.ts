import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { engineeringSpecialtyApi } from '../api/engineeringSpecialtyApi';
import { publishBbvaDataChange } from '../lib/bbvaDataSync';
import type { EngineeringSpecialtyPayload, EngineeringSpecialtyStatus } from '../types/engineeringSpecialty';

const key = ['bbva-engineering-specialties'] as const;

export const useEngineeringSpecialties = (query: { search: string; status: EngineeringSpecialtyStatus | 'ALL'; page: number; size: number }) =>
  useQuery({ queryKey: [...key, query], queryFn: () => engineeringSpecialtyApi.list(query) });
export const useEngineeringSpecialtyExplorer = () =>
  useQuery({ queryKey: [...key, 'explorer'], queryFn: engineeringSpecialtyApi.explorer, staleTime: 30_000 });
export const useEngineeringSpecialty = (id?: string) =>
  useQuery({ queryKey: [...key, 'item', id], queryFn: () => engineeringSpecialtyApi.get(id!), enabled: Boolean(id) });

const invalidate = (client: ReturnType<typeof useQueryClient>) => {
  void client.invalidateQueries({ queryKey: key });
  publishBbvaDataChange(['catalogs', 'collaborators', 'dashboard']);
};
export const useCreateEngineeringSpecialty = () => {
  const client = useQueryClient();
  return useMutation({ mutationFn: (payload: EngineeringSpecialtyPayload) => engineeringSpecialtyApi.create(payload), onSuccess: () => invalidate(client) });
};
export const useUpdateEngineeringSpecialty = () => {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: EngineeringSpecialtyPayload }) => engineeringSpecialtyApi.update(id, payload), onSuccess: () => invalidate(client) });
};
export const useEngineeringSpecialtyStatus = () => {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: EngineeringSpecialtyStatus }) => engineeringSpecialtyApi.status(id, status), onSuccess: () => invalidate(client) });
};
