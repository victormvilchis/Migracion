import React from 'react';
import { BBVAChartCard } from './BBVAChartCard';
import { BBVAEmptyState } from './BBVAEmptyState';
import { BBVAHistorySparkline } from './BBVAHistorySparkline';
import { BBVASearchableSelect } from './BBVASearchableSelect';
import { comparisonText, dashboardHistoryMetrics, historyMetricDefinition, historyMetricValue } from '../pagesBBVATalent/lib/dashboardHistory';
import type { DashboardHistoricalMetricKey, DashboardResponse } from '../pagesBBVATalent/types/dashboard';

interface Props {
  history: DashboardResponse['history'];
  metric: DashboardHistoricalMetricKey;
  onMetricChange: (metric: DashboardHistoricalMetricKey) => void;
  allowedMetrics?: DashboardHistoricalMetricKey[];
  title?: string;
}

export const BBVAHistoricalMetricPanel: React.FC<Props> = ({ history, metric, onMetricChange, allowedMetrics, title = 'Evolución histórica' }) => {
  const definitions = dashboardHistoryMetrics.filter((item) => !allowedMetrics || allowedMetrics.includes(item.key));
  const definition = historyMetricDefinition(metric);
  const comparison = history.comparisons[metric];
  const points = history.points.map((point) => ({ label: point.snapshotDate, value: historyMetricValue(point, metric) }));
  const latest = points[points.length - 1]?.value;

  return (
    <BBVAChartCard
      title={title}
      description={`Snapshots diarios reales · ventana ${history.historyDays} días · comparación solicitada ${history.comparisonDays} día${history.comparisonDays === 1 ? '' : 's'}.`}
      action={(
        <div className="w-[210px] max-w-full">
          <BBVASearchableSelect
            value={metric}
            onChange={(value) => onMetricChange(value as DashboardHistoricalMetricKey)}
            options={definitions.map((item) => ({ value: item.key, label: item.label }))}
            ariaLabel="Métrica histórica"
          />
        </div>
      )}
    >
      {points.length >= 2 ? (
        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div><div className="text-[9px] font-semibold uppercase tracking-[.05em] text-slate-400">{definition.label}</div><div className="mt-1 text-xl font-semibold tabular-nums text-slate-950 [.bbva-dark_&]:text-slate-100">{latest?.toLocaleString('es-MX', { maximumFractionDigits: 2 })}{definition.suffix ?? ''}</div></div>
            <div className="text-right text-[9.5px] text-slate-500 [.bbva-dark_&]:text-slate-400">{comparisonText(comparison) ?? `Sin snapshot disponible para ${history.comparisonTargetDate}`}</div>
          </div>
          <BBVAHistorySparkline points={points} suffix={definition.suffix ?? ''} ariaLabel={`Histórico de ${definition.label}: ${points.map((point) => `${point.label} ${point.value}${definition.suffix ?? ''}`).join(', ')}`} />
        </div>
      ) : (
        <BBVAEmptyState compact title="Histórico todavía insuficiente" description="Se necesitan al menos dos snapshots de fechas distintas. La plataforma no genera tendencias hasta contar con datos reales." />
      )}
    </BBVAChartCard>
  );
};
