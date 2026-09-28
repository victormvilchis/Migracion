import { fetchApi } from '../../lib/api';
import type {
  CertificationCatalogOption,
  CertificationCatalogPageResponse,
  CertificationCatalogPayload,
  CertificationCatalogRecord,
  CertificationCatalogStatus,
  CertificationType,
} from '../types/certificationCatalog';

export interface CertificationCatalogListQuery {
  search?: string;
  status?: CertificationCatalogStatus | 'ALL';
  certificationType?: CertificationType | 'ALL';
  page?: number;
  size?: number;
  sort?: 'name' | 'certificationType' | 'provider' | 'validityMonths' | 'updatedAt' | 'status';
  direction?: 'asc' | 'desc';
}

export async function listCertificationCatalog(query: CertificationCatalogListQuery): Promise<CertificationCatalogPageResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  params.set('status', query.status ?? 'ACTIVE');
  params.set('certificationType', query.certificationType ?? 'ALL');
  params.set('page', String(query.page ?? 0));
  params.set('size', String(query.size ?? 10));
  params.set('sort', query.sort ?? 'name');
  params.set('direction', query.direction ?? 'asc');
  return fetchApi<CertificationCatalogPageResponse>(`/bbva/certification-catalog?${params.toString()}`);
}

export async function listCertificationCatalogOptions(): Promise<{ items: CertificationCatalogOption[] }> {
  return fetchApi<{ items: CertificationCatalogOption[] }>('/bbva/certification-catalog-options');
}

export async function getCertificationCatalogItem(id: string): Promise<{ item: CertificationCatalogRecord }> {
  return fetchApi<{ item: CertificationCatalogRecord }>(`/bbva/certification-catalog/${id}`);
}

export async function createCertificationCatalogItem(payload: CertificationCatalogPayload): Promise<{ item: CertificationCatalogRecord }> {
  return fetchApi<{ item: CertificationCatalogRecord }>('/bbva/certification-catalog', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCertificationCatalogItem(id: string, payload: CertificationCatalogPayload): Promise<{ item: CertificationCatalogRecord }> {
  return fetchApi<{ item: CertificationCatalogRecord }>(`/bbva/certification-catalog/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function updateCertificationCatalogStatus(id: string, status: CertificationCatalogStatus): Promise<{ item: CertificationCatalogRecord }> {
  return fetchApi<{ item: CertificationCatalogRecord }>(`/bbva/certification-catalog/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function deleteCertificationCatalogItem(id: string): Promise<{ deleted: boolean }> {
  return fetchApi<{ deleted: boolean }>(`/bbva/certification-catalog/${id}`, { method: 'DELETE' });
}
