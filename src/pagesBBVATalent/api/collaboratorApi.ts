import { fetchApi } from '../../lib/api';
import type { Collaborator, CollaboratorPayload } from '../types/collaborator';

export const collaboratorApi = {
  list: () => fetchApi<{ items: Collaborator[]; storage: string }>('/bbva/collaborators'),
  get: (id: string) => fetchApi<{ item: Collaborator; storage: string }>(`/bbva/collaborators/${id}`),
  create: (payload: CollaboratorPayload) => fetchApi<{ item: Collaborator; storage: string }>('/bbva/collaborators', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: CollaboratorPayload) => fetchApi<{ item: Collaborator; storage: string }>(`/bbva/collaborators/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id: string) => fetchApi<{ deleted: boolean }>(`/bbva/collaborators/${id}`, { method: 'DELETE' }),
};
