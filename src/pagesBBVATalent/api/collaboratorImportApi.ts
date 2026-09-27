import { fetchApi } from '../../lib/api';
import type { ImportApplyPayload, ImportApplyResult, ImportPreviewResponse, ImportSourceRow } from '../types/collaboratorImport';

export const collaboratorImportApi = {
  preview: (rows: ImportSourceRow[]) => fetchApi<ImportPreviewResponse>('/bbva/collaborators/import/preview', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  }),
  apply: (payload: ImportApplyPayload) => fetchApi<ImportApplyResult>('/bbva/collaborators/import/apply', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};
