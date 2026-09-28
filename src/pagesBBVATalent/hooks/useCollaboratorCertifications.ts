import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collaboratorCertificationApi } from '../api/collaboratorCertificationApi';
import type { CertificationAttemptResult, CertificationCriticalResolutionPayload } from '../types/collaboratorCertification';
import { publishBbvaDataChange } from '../lib/bbvaDataSync';

export function useCollaboratorCertifications(collaboratorId?: string) {
  return useQuery({ queryKey: ['collaborator-certifications', collaboratorId], queryFn: () => collaboratorCertificationApi.list(collaboratorId as string), enabled: Boolean(collaboratorId) });
}

export function useCollaboratorCertification(collaboratorId?: string, recordId?: string) {
  return useQuery({ queryKey: ['collaborator-certifications', collaboratorId, recordId], queryFn: () => collaboratorCertificationApi.get(collaboratorId as string, recordId as string), enabled: Boolean(collaboratorId && recordId) });
}

function useInvalidate(collaboratorId: string) {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: ['collaborator-certifications', collaboratorId] });
    void client.invalidateQueries({ queryKey: ['collaborators', collaboratorId] });
    void client.invalidateQueries({ queryKey: ['collaborators'] });
    void client.invalidateQueries({ queryKey: ['bbva-dashboard'] });
    void client.invalidateQueries({ queryKey: ['certification-tracking'] });
    publishBbvaDataChange(['certifications','collaborators','dashboard']);
  };
}

export function useAddCollaboratorCertification(collaboratorId: string) {
  const invalidate = useInvalidate(collaboratorId);
  return useMutation({ mutationFn: ({ certificationId, certificationLevel }: { certificationId: string; certificationLevel?: string }) => collaboratorCertificationApi.add(collaboratorId, certificationId, certificationLevel), onSuccess: invalidate });
}

export function useUpdateCollaboratorCertification(collaboratorId: string) {
  const invalidate = useInvalidate(collaboratorId);
  return useMutation({ mutationFn: ({ recordId, payload }: { recordId: string; payload: { scheduledDate: string; notes: string; mandatory: boolean } }) => collaboratorCertificationApi.update(collaboratorId, recordId, payload), onSuccess: invalidate });
}

export function useAddCertificationAttempt(collaboratorId: string) {
  const invalidate = useInvalidate(collaboratorId);
  return useMutation({ mutationFn: ({ recordId, payload }: { recordId: string; payload: { applicationDate: string; result: CertificationAttemptResult; notes: string } }) => collaboratorCertificationApi.addAttempt(collaboratorId, recordId, payload), onSuccess: invalidate });
}

export function useResolveCriticalCertification(collaboratorId: string) {
  const invalidate = useInvalidate(collaboratorId);
  return useMutation({ mutationFn: ({ recordId, payload }: { recordId: string; payload: CertificationCriticalResolutionPayload }) => collaboratorCertificationApi.resolveCritical(collaboratorId, recordId, payload), onSuccess: invalidate });
}

export function useRecertifyCollaboratorCertification(collaboratorId: string) {
  const invalidate = useInvalidate(collaboratorId);
  return useMutation({ mutationFn: (recordId: string) => collaboratorCertificationApi.recertify(collaboratorId, recordId), onSuccess: invalidate });
}

export function useMarkCertificationNotApplicable(collaboratorId: string) {
  const invalidate = useInvalidate(collaboratorId);
  return useMutation({ mutationFn: (recordId: string) => collaboratorCertificationApi.markNotApplicable(collaboratorId, recordId), onSuccess: invalidate });
}

export function useCertificationTracking() {
  return useQuery({ queryKey: ['certification-tracking'], queryFn: collaboratorCertificationApi.tracking });
}

export function useGenerateCertificationCommunication(collaboratorId: string) {
  return useMutation({ mutationFn: ({ recordId, attemptId, regenerate = false }: { recordId: string; attemptId: string; regenerate?: boolean }) => collaboratorCertificationApi.generateCommunication(collaboratorId, recordId, attemptId, regenerate) });
}

export function usePrepareCertificationCommunicationEmail(collaboratorId: string) {
  return useMutation({ mutationFn: ({ recordId, communicationId, payload }: { recordId: string; communicationId: string; payload: { subject?: string; body?: string } }) => collaboratorCertificationApi.prepareCommunicationEmail(collaboratorId, recordId, communicationId, payload) });
}
