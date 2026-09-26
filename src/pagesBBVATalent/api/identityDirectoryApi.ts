import { fetchApi } from '../../lib/api';
import type { IdentityDirectoryLookupResponse } from '../types/identityDirectory';

export const identityDirectoryApi = {
  lookup: (isValue: string) =>
    fetchApi<IdentityDirectoryLookupResponse>(`/bbva/identity-directory/${encodeURIComponent(isValue.trim())}`),
};
