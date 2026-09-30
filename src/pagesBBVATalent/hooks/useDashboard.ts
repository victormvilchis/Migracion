import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardFilters } from '../types/dashboard';

export function useBbvaDashboard(filters: DashboardFilters) {
  return useQuery({
    queryKey: ['bbva-dashboard', filters],
    queryFn: () => dashboardApi.get(filters),
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
