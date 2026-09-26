import { fetchApi } from '../../lib/api';
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
  list: () => fetchApi<TalentListResponse>('/bbva/talent-bank'),
  get: (id: string) => fetchApi<{ item: Talent; storage: string }>(`/bbva/talent-bank/${id}`),
  create: (payload: TalentPayload) =>
    fetchApi<{ item: Talent; storage: string }>('/bbva/talent-bank', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: TalentPayload) =>
    fetchApi<{ item: Talent; storage: string }>(`/bbva/talent-bank/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateStage: (id: string, stage: TalentStage) =>
    fetchApi<{ item: Talent; storage: string }>(`/bbva/talent-bank/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    }),
  convert: (id: string) =>
    fetchApi<{ collaboratorId: string; message: string }>(`/bbva/talent-bank/${id}/convert`, { method: 'POST' }),
  remove: (id: string) =>
    fetchApi<{ deleted: boolean }>(`/bbva/talent-bank/${id}`, { method: 'DELETE' }),
  history: (id: string) =>
    fetchApi<{ items: TalentHistoryItem[] }>(`/bbva/talent-bank/${id}/history`),
  getCv: (id: string) =>
    fetchApi<{ document: TalentCvDownload }>(`/bbva/talent-bank/${id}/cv`),
  saveCv: (id: string, payload: TalentCvPayload) =>
    fetchApi<{ cv: Talent['cv'] }>(`/bbva/talent-bank/${id}/cv`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
