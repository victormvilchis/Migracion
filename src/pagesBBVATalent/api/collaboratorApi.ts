import { fetchApi } from '../../lib/api';
import type { Collaborator } from '../types/collaborator';

export const collaboratorApi = {
  list: () => fetchApi<{ items: Collaborator[]; storage: string }>('/bbva/collaborators'),
  get: (id: string) => fetchApi<{ item: Collaborator; storage: string }>(`/bbva/collaborators/${id}`),
};
