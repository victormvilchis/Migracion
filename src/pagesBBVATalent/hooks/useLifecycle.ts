import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lifecycleApi } from '../api/lifecycleApi';
import type { MoveCollaboratorToTalentPayload } from '../types/lifecycle';
import { publishBbvaDataChange } from '../lib/bbvaDataSync';

export function useLifecycleReasons() {
  return useQuery({ queryKey: ['bbva-lifecycle-reasons'], queryFn: lifecycleApi.reasons });
}

export function useCollaboratorLifecycle(id?: string) {
  return useQuery({
    queryKey: ['collaborators', id, 'lifecycle'],
    queryFn: () => lifecycleApi.collaboratorTimeline(id as string),
    enabled: Boolean(id),
  });
}

export function useTalentLifecycle(id?: string) {
  return useQuery({
    queryKey: ['talent', id, 'lifecycle'],
    queryFn: () => lifecycleApi.talentTimeline(id as string),
    enabled: Boolean(id),
  });
}

export function useMoveCollaboratorToTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MoveCollaboratorToTalentPayload }) => lifecycleApi.moveCollaboratorToTalent(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      void queryClient.invalidateQueries({ queryKey: ['collaborators', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['collaborators', variables.id, 'lifecycle'] });
      void queryClient.invalidateQueries({ queryKey: ['talent'] });
      publishBbvaDataChange(['talent','collaborators','dashboard','certifications']);
    },
  });
}
