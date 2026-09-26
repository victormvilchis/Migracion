import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCertificationCatalogItem,
  deleteCertificationCatalogItem,
  getCertificationCatalogItem,
  listCertificationCatalog,
  listCertificationCatalogOptions,
  updateCertificationCatalogItem,
  updateCertificationCatalogStatus,
  type CertificationCatalogListQuery,
} from '../api/certificationCatalogApi';
import type { CertificationCatalogPayload, CertificationCatalogStatus } from '../types/certificationCatalog';

const key = ['bbva-certification-catalog'] as const;

export function useCertificationCatalogList(query: CertificationCatalogListQuery) {
  return useQuery({ queryKey: [...key, 'list', query], queryFn: () => listCertificationCatalog(query) });
}
export function useCertificationCatalogOptions() {
  return useQuery({ queryKey: [...key, 'options'], queryFn: listCertificationCatalogOptions });
}
export function useCertificationCatalogItem(id?: string) {
  return useQuery({ queryKey: [...key, 'item', id], queryFn: () => getCertificationCatalogItem(id!), enabled: Boolean(id) });
}
export function useCreateCertificationCatalogItem() {
  const client = useQueryClient();
  return useMutation({ mutationFn: createCertificationCatalogItem, onSuccess: () => client.invalidateQueries({ queryKey: key }) });
}
export function useUpdateCertificationCatalogItem() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: CertificationCatalogPayload }) => updateCertificationCatalogItem(id, payload), onSuccess: () => client.invalidateQueries({ queryKey: key }) });
}
export function useUpdateCertificationCatalogStatus() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: CertificationCatalogStatus }) => updateCertificationCatalogStatus(id, status), onSuccess: () => client.invalidateQueries({ queryKey: key }) });
}
export function useDeleteCertificationCatalogItem() {
  const client = useQueryClient();
  return useMutation({ mutationFn: deleteCertificationCatalogItem, onSuccess: () => client.invalidateQueries({ queryKey: key }) });
}
