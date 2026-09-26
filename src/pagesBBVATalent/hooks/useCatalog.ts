import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCatalogItem,
  deleteCatalogItem,
  getCatalogItem,
  listCatalog,
  listCatalogOptions,
  updateCatalogItem,
  updateCatalogStatus,
  type CatalogListQuery,
} from '../api/catalogApi';
import type { CatalogPayload, CatalogStatus, CatalogType } from '../types/catalog';

const key = (type: CatalogType) => ['bbva-catalog', type] as const;

export function useCatalogList(type: CatalogType, query: CatalogListQuery) {
  return useQuery({ queryKey: [...key(type), 'list', query], queryFn: () => listCatalog(type, query) });
}

export function useCatalogItem(type: CatalogType, id?: string) {
  return useQuery({ queryKey: [...key(type), 'item', id], queryFn: () => getCatalogItem(type, id!), enabled: Boolean(id) });
}

export function useCatalogOptions(type: CatalogType) {
  return useQuery({ queryKey: [...key(type), 'options'], queryFn: () => listCatalogOptions(type), staleTime: 60_000 });
}

export function useCreateCatalogItem(type: CatalogType) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (payload: CatalogPayload) => createCatalogItem(type, payload), onSuccess: () => client.invalidateQueries({ queryKey: key(type) }) });
}

export function useUpdateCatalogItem(type: CatalogType) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CatalogPayload }) => updateCatalogItem(type, id, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: key(type) }),
  });
}

export function useUpdateCatalogStatus(type: CatalogType) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CatalogStatus }) => updateCatalogStatus(type, id, status),
    onSuccess: () => client.invalidateQueries({ queryKey: key(type) }),
  });
}

export function useDeleteCatalogItem(type: CatalogType) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => deleteCatalogItem(type, id), onSuccess: () => client.invalidateQueries({ queryKey: key(type) }) });
}
