import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { talentApi } from '../api/talentApi';
import type { TalentConversionPayload, TalentCvPayload, TalentPayload } from '../types/talent';
import { publishBbvaDataChange } from '../lib/bbvaDataSync';

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


export function useCreateTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TalentPayload) => talentApi.create(payload),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['talent'] }); publishBbvaDataChange(['talent','collaborators','dashboard']); },
  });
}

export function useUpdateTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TalentPayload }) => talentApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['talent'] });
      queryClient.invalidateQueries({ queryKey: ['talent', variables.id] });
      publishBbvaDataChange(['talent','collaborators','dashboard']);
    },
  });
}


export function useConvertTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TalentConversionPayload }) => talentApi.convert(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent'] });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      publishBbvaDataChange(['talent','collaborators','dashboard','certifications']);
    },
  });
}

export function useDeleteTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => talentApi.remove(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['talent'] }); publishBbvaDataChange(['talent','collaborators','dashboard']); },
  });
}

export function useSaveTalentCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TalentCvPayload }) => talentApi.saveCv(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['talent'] });
      queryClient.invalidateQueries({ queryKey: ['talent', variables.id] });
      publishBbvaDataChange(['talent','collaborators','dashboard']);
    },
  });
}
