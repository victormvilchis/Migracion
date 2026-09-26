import { useQuery } from '@tanstack/react-query';
import { collaboratorApi } from '../services/collaboratorApi';

export function useCollaborators() {
  return useQuery({ queryKey: ['collaborators'], queryFn: collaboratorApi.list });
}
