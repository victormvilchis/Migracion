import { fetchApi } from '../../lib/api';
import type { DashboardFilters, DashboardResponse } from '../types/dashboard';

export const dashboardApi = {
  get: (filters: DashboardFilters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<DashboardResponse>(`/bbva/dashboard${suffix}`);
  },
};
