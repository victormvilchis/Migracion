import { fetchApi } from '../../lib/api';
import type { CollaboratorCertification, CollaboratorCertificationDetail, CollaboratorCertificationSummary, CertificationAttemptResult } from '../types/collaboratorCertification';

export const collaboratorCertificationApi = {
  list: (collaboratorId: string) => fetchApi<{ items: CollaboratorCertification[]; summary: CollaboratorCertificationSummary }>(`/bbva/collaborators/${collaboratorId}/certifications`),
  get: (collaboratorId: string, recordId: string) => fetchApi<CollaboratorCertificationDetail>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}`),
  add: (collaboratorId: string, certificationId: string) => fetchApi<{ item: CollaboratorCertification }>(`/bbva/collaborators/${collaboratorId}/certifications`, { method: 'POST', body: JSON.stringify({ certificationId }) }),
  update: (collaboratorId: string, recordId: string, payload: { applicationDate: string; notes: string; mandatory: boolean }) => fetchApi<{ item: CollaboratorCertification }>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  addAttempt: (collaboratorId: string, recordId: string, payload: { applicationDate: string; result: CertificationAttemptResult; resultDate: string; notes: string }) => fetchApi<CollaboratorCertificationDetail>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}/attempts`, { method: 'POST', body: JSON.stringify(payload) }),
  recertify: (collaboratorId: string, recordId: string) => fetchApi<{ item: CollaboratorCertification }>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}/recertify`, { method: 'POST' }),
  markNotApplicable: (collaboratorId: string, recordId: string) => fetchApi<{ item: CollaboratorCertification }>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}`, { method: 'DELETE' }),
};
