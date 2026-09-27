import { fetchApi } from '../../lib/api';
import type { CollaboratorCertification, CollaboratorCertificationDetail, CollaboratorCertificationSummary, CertificationAttemptResult, CertificationTrackingItem, CertificationCommunication } from '../types/collaboratorCertification';

export const collaboratorCertificationApi = {
  tracking: () => fetchApi<{ items: CertificationTrackingItem[] }>('/bbva/certifications/tracking-items'),
  list: (collaboratorId: string) => fetchApi<{ items: CollaboratorCertification[]; summary: CollaboratorCertificationSummary }>(`/bbva/collaborators/${collaboratorId}/certifications`),
  get: (collaboratorId: string, recordId: string) => fetchApi<CollaboratorCertificationDetail>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}`),
  add: (collaboratorId: string, certificationId: string) => fetchApi<{ item: CollaboratorCertification }>(`/bbva/collaborators/${collaboratorId}/certifications`, { method: 'POST', body: JSON.stringify({ certificationId }) }),
  update: (collaboratorId: string, recordId: string, payload: { scheduledDate: string; notes: string; mandatory: boolean }) => fetchApi<{ item: CollaboratorCertification }>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  addAttempt: (collaboratorId: string, recordId: string, payload: { applicationDate: string; result: CertificationAttemptResult; notes: string }) => fetchApi<CollaboratorCertificationDetail>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}/attempts`, { method: 'POST', body: JSON.stringify(payload) }),
  recertify: (collaboratorId: string, recordId: string) => fetchApi<{ item: CollaboratorCertification }>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}/recertify`, { method: 'POST' }),
  generateCommunication: (collaboratorId: string, recordId: string, attemptId: string, regenerate = false) => fetchApi<{ item: CertificationCommunication }>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}/communications`, { method: 'POST', body: JSON.stringify({ attemptId, regenerate }) }),
  prepareCommunicationEmail: (collaboratorId: string, recordId: string, communicationId: string, payload: { recipientEmail?: string; subject?: string; body?: string }) => fetchApi<{ item: CertificationCommunication }>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}/communications/${communicationId}/email`, { method: 'POST', body: JSON.stringify(payload) }),
  markNotApplicable: (collaboratorId: string, recordId: string) => fetchApi<{ item: CollaboratorCertification }>(`/bbva/collaborators/${collaboratorId}/certifications/${recordId}`, { method: 'DELETE' }),
};
