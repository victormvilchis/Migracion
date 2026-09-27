import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collaboratorCertificationApi } from '../api/collaboratorCertificationApi';
import type { CertificationAttemptResult } from '../types/collaboratorCertification';

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
  };
}

export function useAddCollaboratorCertification(collaboratorId: string) {
  const invalidate = useInvalidate(collaboratorId);
  return useMutation({ mutationFn: (certificationId: string) => collaboratorCertificationApi.add(collaboratorId, certificationId), onSuccess: invalidate });
}

export function useUpdateCollaboratorCertification(collaboratorId: string) {
  const invalidate = useInvalidate(collaboratorId);
  return useMutation({ mutationFn: ({ recordId, payload }: { recordId: string; payload: { applicationDate: string; notes: string; mandatory: boolean } }) => collaboratorCertificationApi.update(collaboratorId, recordId, payload), onSuccess: invalidate });
}

export function useAddCertificationAttempt(collaboratorId: string) {
  const invalidate = useInvalidate(collaboratorId);
  return useMutation({ mutationFn: ({ recordId, payload }: { recordId: string; payload: { applicationDate: string; result: CertificationAttemptResult; resultDate: string; notes: string } }) => collaboratorCertificationApi.addAttempt(collaboratorId, recordId, payload), onSuccess: invalidate });
}

export function useRecertifyCollaboratorCertification(collaboratorId: string) {
  const invalidate = useInvalidate(collaboratorId);
  return useMutation({ mutationFn: (recordId: string) => collaboratorCertificationApi.recertify(collaboratorId, recordId), onSuccess: invalidate });
}

export function useMarkCertificationNotApplicable(collaboratorId: string) {
  const invalidate = useInvalidate(collaboratorId);
  return useMutation({ mutationFn: (recordId: string) => collaboratorCertificationApi.markNotApplicable(collaboratorId, recordId), onSuccess: invalidate });
}
