import type { CatalogPageResponse, CatalogPayload, CatalogRecord, CatalogStatus, CatalogType } from '../types/catalog';

async function parseJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'No fue posible completar la operación del catálogo.');
  return body;
}

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
  const response = await fetch(`/api/bbva/catalogs/${type}?${params.toString()}`);
  return parseJson(response) as Promise<CatalogPageResponse>;
}

export async function getCatalogItem(type: CatalogType, id: string): Promise<{ item: CatalogRecord }> {
  return parseJson(await fetch(`/api/bbva/catalogs/${type}/${id}`));
}

export async function createCatalogItem(type: CatalogType, payload: CatalogPayload): Promise<{ item: CatalogRecord }> {
  return parseJson(await fetch(`/api/bbva/catalogs/${type}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }));
}

export async function updateCatalogItem(type: CatalogType, id: string, payload: CatalogPayload): Promise<{ item: CatalogRecord }> {
  return parseJson(await fetch(`/api/bbva/catalogs/${type}/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }));
}

export async function updateCatalogStatus(type: CatalogType, id: string, status: CatalogStatus): Promise<{ item: CatalogRecord }> {
  return parseJson(await fetch(`/api/bbva/catalogs/${type}/${id}/status`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
  }));
}

export async function deleteCatalogItem(type: CatalogType, id: string): Promise<{ deleted: boolean }> {
  return parseJson(await fetch(`/api/bbva/catalogs/${type}/${id}`, { method: 'DELETE' }));
}
