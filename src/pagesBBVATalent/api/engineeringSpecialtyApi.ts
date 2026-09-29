import { fetchApi } from '../../lib/api';
import type {
  EngineeringSpecialty,
  EngineeringSpecialtyExplorer,
  EngineeringSpecialtyPage,
  EngineeringSpecialtyPayload,
  EngineeringSpecialtyStatus,
} from '../types/engineeringSpecialty';

export const engineeringSpecialtyApi = {
  list: (query: { search: string; status: EngineeringSpecialtyStatus | 'ALL'; page: number; size: number }) =>
    fetchApi<EngineeringSpecialtyPage>(`/bbva/engineering-specialties?search=${encodeURIComponent(query.search)}&status=${query.status}&page=${query.page}&size=${query.size}`),
  explorer: () => fetchApi<EngineeringSpecialtyExplorer>('/bbva/engineering-specialty-explorer'),
  get: (id: string) => fetchApi<{ item: EngineeringSpecialty }>(`/bbva/engineering-specialties/${id}`),
  create: (payload: EngineeringSpecialtyPayload) => fetchApi<{ item: EngineeringSpecialty }>('/bbva/engineering-specialties', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: EngineeringSpecialtyPayload) => fetchApi<{ item: EngineeringSpecialty }>(`/bbva/engineering-specialties/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  status: (id: string, status: EngineeringSpecialtyStatus) => fetchApi<{ item: EngineeringSpecialty }>(`/bbva/engineering-specialties/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
