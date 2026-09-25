import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { talentApi } from '../services/talentApi';
import type { TalentCvPayload, TalentPayload, TalentStage } from '../types/talent';

export function useTalentList() {
  return useQuery({ queryKey: ['talent'], queryFn: talentApi.list });
}

export function useTalent(id?: string) {
  return useQuery({
    queryKey: ['talent', id],
    queryFn: () => talentApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useTalentHistory(id?: string) {
  return useQuery({
    queryKey: ['talent', id, 'history'],
    queryFn: () => talentApi.history(id as string),
    enabled: Boolean(id),
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['talent'] });
      queryClient.invalidateQueries({ queryKey: ['talent', variables.id] });
    },
  });
}

export function useUpdateTalentStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: TalentStage }) => talentApi.updateStage(id, stage),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['talent'] });
      queryClient.invalidateQueries({ queryKey: ['talent', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['talent', variables.id, 'history'] });
    },
  });
}

export function useDeleteTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => talentApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['talent'] }),
  });
}

export function useSaveTalentCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TalentCvPayload }) => talentApi.saveCv(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['talent'] });
      queryClient.invalidateQueries({ queryKey: ['talent', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['talent', variables.id, 'history'] });
    },
  });
}
