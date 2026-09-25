import { fetchApi } from '../../../lib/api';
import type { Talent, TalentPayload, TalentStage } from '../types/talent';

export interface TalentListResponse {
  items: Talent[];
  storage: string;
}

export const talentApi = {
  list: () => fetchApi<TalentListResponse>('/talent'),
  get: (id: string) => fetchApi<{ item: Talent; storage: string }>(`/talent/${id}`),
  create: (payload: TalentPayload) =>
    fetchApi<{ item: Talent; storage: string }>('/talent', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: TalentPayload) =>
    fetchApi<{ item: Talent; storage: string }>(`/talent/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateStage: (id: string, stage: TalentStage) =>
    fetchApi<{ item: Talent; storage: string }>(`/talent/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    }),
};
