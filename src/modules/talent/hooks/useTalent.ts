import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { talentApi } from '../services/talentApi';
import type { TalentPayload, TalentStage } from '../types/talent';

export function useTalentList() {
  return useQuery({
    queryKey: ['talent'],
    queryFn: talentApi.list,
  });
}

export function useCreateTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TalentPayload) => talentApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['talent'] }),
  });
}

export function useUpdateTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TalentPayload }) => talentApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['talent'] }),
  });
}

export function useUpdateTalentStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: TalentStage }) => talentApi.updateStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['talent'] }),
  });
}
