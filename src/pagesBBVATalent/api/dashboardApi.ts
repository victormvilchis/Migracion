import { fetchApi } from '../../lib/api';
import type { DashboardFilters, DashboardResponse } from '../types/dashboard';

export const dashboardApi = {
  get: (filters: DashboardFilters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && String(value).trim()) params.set(key, String(value)); });
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<DashboardResponse>(`/bbva/dashboard${suffix}`);
  },
};
