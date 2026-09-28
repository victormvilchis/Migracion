import type { DashboardHistoricalMetricKey, DashboardMetricComparison, DashboardMetricSnapshotPoint } from '../types/dashboard';

export interface DashboardHistoryMetricDefinition {
  key: DashboardHistoricalMetricKey;
  label: string;
  suffix?: string;
  unit: 'COUNT' | 'PERCENTAGE_POINTS';
}

export const dashboardHistoryMetrics: DashboardHistoryMetricDefinition[] = [
  { key: 'coveragePercent', label: 'Cobertura', suffix: '%', unit: 'PERCENTAGE_POINTS' },
  { key: 'collaboratorsActive', label: 'Colaboradores activos', unit: 'COUNT' },
  { key: 'talentBankActive', label: 'Banco de talento', unit: 'COUNT' },
  { key: 'certificationsApplicable', label: 'Certificaciones aplicables', unit: 'COUNT' },
  { key: 'expiring', label: 'Próximas a vencer', unit: 'COUNT' },
  { key: 'expired', label: 'Vencidas', unit: 'COUNT' },
  { key: 'recertificationPending', label: 'Recertificación', unit: 'COUNT' },
  { key: 'pending', label: 'Pendientes', unit: 'COUNT' },
  { key: 'vendorReadyPercent', label: 'Preparación Vendors', suffix: '%', unit: 'PERCENTAGE_POINTS' },
  { key: 'vendorPending', label: 'Pendientes Vendors', unit: 'COUNT' },
  { key: 'vendorExitRequired', label: 'Críticos 2/2', unit: 'COUNT' },
  { key: 'dataQualityPending', label: 'Datos por completar', unit: 'COUNT' },
];

export const historyMetricDefinition = (key: DashboardHistoricalMetricKey) =>
  dashboardHistoryMetrics.find((item) => item.key === key) ?? dashboardHistoryMetrics[0];

export const historyMetricValue = (point: DashboardMetricSnapshotPoint, key: DashboardHistoricalMetricKey) => Number(point[key] ?? 0);

export function comparisonText(comparison?: DashboardMetricComparison): string | undefined {
  if (!comparison) return undefined;
  const sign = comparison.delta > 0 ? '+' : '';
  const unit = comparison.unit === 'PERCENTAGE_POINTS' ? ' pp' : '';
  return `${sign}${comparison.delta.toLocaleString('es-MX', { maximumFractionDigits: 2 })}${unit} vs ${comparison.previousSnapshotDate}`;
}
