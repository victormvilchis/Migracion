import { fetchApi } from '../../../lib/api';
import type {
  Talent,
  TalentCvDownload,
  TalentCvPayload,
  TalentHistoryItem,
  TalentPayload,
  TalentStage,
} from '../types/talent';

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
  convert: (id: string) =>
    fetchApi<{ collaboratorId: string; message: string }>(`/talent/${id}/convert`, { method: 'POST' }),
  remove: (id: string) =>
    fetchApi<{ deleted: boolean }>(`/talent/${id}`, { method: 'DELETE' }),
  history: (id: string) =>
    fetchApi<{ items: TalentHistoryItem[] }>(`/talent/${id}/history`),
  getCv: (id: string) =>
    fetchApi<{ document: TalentCvDownload }>(`/talent/${id}/cv`),
  saveCv: (id: string, payload: TalentCvPayload) =>
    fetchApi<{ cv: Talent['cv'] }>(`/talent/${id}/cv`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
