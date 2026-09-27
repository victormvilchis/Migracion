import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collaboratorImportApi } from '../api/collaboratorImportApi';
import type { ImportApplyPayload, ImportSourceRow } from '../types/collaboratorImport';

export function usePreviewCollaboratorImport() {
  return useMutation({ mutationFn: (rows: ImportSourceRow[]) => collaboratorImportApi.preview(rows) });
}

export function useApplyCollaboratorImport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportApplyPayload) => collaboratorImportApi.apply(payload),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['collaborators'] });
      void client.invalidateQueries({ queryKey: ['talent-bank'] });
      void client.invalidateQueries({ queryKey: ['bbva-dashboard'] });
      void client.invalidateQueries({ queryKey: ['certification-tracking'] });
    },
  });
}
