import { fetchApi } from '../../lib/api';
import type {
  LifecycleReasonOption,
  MoveCollaboratorToTalentPayload,
  MoveCollaboratorToTalentResponse,
  PersonLifecycleEvent,
} from '../types/lifecycle';

export const lifecycleApi = {
  reasons: () => fetchApi<{ items: LifecycleReasonOption[] }>('/bbva/lifecycle/reasons'),
  collaboratorTimeline: (id: string) => fetchApi<{ items: PersonLifecycleEvent[] }>(`/bbva/collaborators/${id}/lifecycle`),
  talentTimeline: (id: string) => fetchApi<{ items: PersonLifecycleEvent[] }>(`/bbva/talent-bank/${id}/lifecycle`),
  moveCollaboratorToTalent: (id: string, payload: MoveCollaboratorToTalentPayload) =>
    fetchApi<MoveCollaboratorToTalentResponse>(`/bbva/collaborators/${id}/move-to-talent`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
