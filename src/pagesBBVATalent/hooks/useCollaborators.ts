import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collaboratorApi } from '../api/collaboratorApi';
import type { CollaboratorPayload } from '../types/collaborator';
import { publishBbvaDataChange } from '../lib/bbvaDataSync';

export function useCollaborators() {
  return useQuery({ queryKey: ['collaborators'], queryFn: collaboratorApi.list });
}

export function useCollaborator(id?: string) {
  return useQuery({ queryKey: ['collaborators', id], queryFn: () => collaboratorApi.get(id as string), enabled: Boolean(id) });
}

export function useCreateCollaborator() {
  const client = useQueryClient();
  return useMutation({ mutationFn: collaboratorApi.create, onSuccess: () => { void client.invalidateQueries({ queryKey: ['collaborators'] }); publishBbvaDataChange(['collaborators','talent','dashboard','certifications']); } });
}

export function useUpdateCollaborator() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: CollaboratorPayload }) => collaboratorApi.update(id, payload), onSuccess: (_data, variables) => { void client.invalidateQueries({ queryKey: ['collaborators'] }); void client.invalidateQueries({ queryKey: ['collaborators', variables.id] }); publishBbvaDataChange(['collaborators','talent','dashboard','certifications']); } });
}
