import { fetchApi } from '../../lib/api';
import type { CatalogOption, CatalogPageResponse, CatalogPayload, CatalogRecord, CatalogStatus, CatalogType } from '../types/catalog';

export interface CatalogListQuery {
  search?: string;
  status?: CatalogStatus | 'ALL';
  page?: number;
  size?: number;
  sort?: 'name' | 'usageCount' | 'updatedAt' | 'status';
  direction?: 'asc' | 'desc';
}

export async function listCatalog(type: CatalogType, query: CatalogListQuery): Promise<CatalogPageResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  params.set('status', query.status ?? 'ACTIVE');
  params.set('page', String(query.page ?? 0));
  params.set('size', String(query.size ?? 10));
  params.set('sort', query.sort ?? 'name');
  params.set('direction', query.direction ?? 'asc');
  return fetchApi<CatalogPageResponse>(`/bbva/catalogs/${type}?${params.toString()}`);
}

export async function getCatalogItem(type: CatalogType, id: string): Promise<{ item: CatalogRecord }> {
  return fetchApi<{ item: CatalogRecord }>(`/bbva/catalogs/${type}/${id}`);
}

export async function listCatalogOptions(type: CatalogType): Promise<{ items: CatalogOption[] }> {
  return fetchApi<{ items: CatalogOption[] }>(`/bbva/catalog-options/${type}`);
}

export async function createCatalogItem(type: CatalogType, payload: CatalogPayload): Promise<{ item: CatalogRecord }> {
  return fetchApi<{ item: CatalogRecord }>(`/bbva/catalogs/${type}`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCatalogItem(type: CatalogType, id: string, payload: CatalogPayload): Promise<{ item: CatalogRecord }> {
  return fetchApi<{ item: CatalogRecord }>(`/bbva/catalogs/${type}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function updateCatalogStatus(type: CatalogType, id: string, status: CatalogStatus): Promise<{ item: CatalogRecord }> {
  return fetchApi<{ item: CatalogRecord }>(`/bbva/catalogs/${type}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function deleteCatalogItem(type: CatalogType, id: string): Promise<{ deleted: boolean }> {
  return fetchApi<{ deleted: boolean }>(`/bbva/catalogs/${type}/${id}`, { method: 'DELETE' });
}
