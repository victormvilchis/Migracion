import React, { useMemo } from 'react';
import { cn } from '../lib/utils';
import { BBVAEmptyState } from './BBVAEmptyState';

export interface BBVADonutItem {
  key?: string;
  label: string;
  value: number;
  color?: string;
}

interface BBVADonutChartProps {
  items: BBVADonutItem[];
  center: React.ReactNode;
  caption: string;
  onSelect?: (item: BBVADonutItem) => void;
  selectedKey?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  size?: 'sm' | 'md';
}

const defaultColors = ['#2563eb', '#7c3aed', '#16a34a', '#f59e0b', '#ef4444', '#64748b'];

export const BBVADonutChart: React.FC<BBVADonutChartProps> = ({
  items,
  center,
  caption,
  onSelect,
  selectedKey,
  emptyTitle = 'Sin datos para mostrar',
  emptyDescription = 'No existen registros para los filtros actuales.',
  size = 'md',
}) => {
  const total = useMemo(() => items.reduce((sum, item) => sum + Math.max(0, item.value), 0), [items]);
  const background = useMemo(() => {
    if (!total) return 'conic-gradient(#e2e8f0 0 100%)';
    let cursor = 0;
    const stops = items.map((item, index) => {
      const start = (cursor / total) * 100;
      cursor += Math.max(0, item.value);
      const end = (cursor / total) * 100;
      return `${item.color ?? defaultColors[index % defaultColors.length]} ${start}% ${end}%`;
    });
    return `conic-gradient(${stops.join(',')})`;
  }, [items, total]);

  if (!total) return <BBVAEmptyState compact title={emptyTitle} description={emptyDescription} />;

  const chartSize = size === 'sm' ? 'h-32 w-32' : 'h-36 w-36';
  const inset = size === 'sm' ? 'inset-[17px]' : 'inset-[18px]';

  return (
    <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
      <div
        className={cn('relative mx-auto rounded-full', chartSize)}
        style={{ background }}
        role="img"
        aria-label={`${caption}: ${items.map((item) => `${item.label} ${item.value}`).join(', ')}`}
      >
        <div className={cn('absolute flex flex-col items-center justify-center rounded-full bg-white shadow-inner [.bbva-dark_&]:bg-slate-900', inset)}>
          <div className="text-2xl font-semibold text-slate-950 [.bbva-dark_&]:text-slate-100">{center}</div>
          <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">{caption}</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map((item, index) => {
          const percentage = total ? (item.value / total) * 100 : 0;
          const interactive = Boolean(onSelect && item.key);
          const active = Boolean(item.key && selectedKey === item.key);
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-2 text-slate-600 [.bbva-dark_&]:text-slate-300">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? defaultColors[index % defaultColors.length] }} aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="font-semibold tabular-nums text-slate-900 [.bbva-dark_&]:text-slate-100">{item.value}</span>
                <span className="w-10 text-right text-[9px] tabular-nums text-slate-400">{percentage.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%</span>
              </span>
            </>
          );
          return interactive ? (
            <button
              key={item.key ?? item.label}
              type="button"
              onClick={() => onSelect?.(item)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-[10.5px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25',
                active ? 'bg-blue-50 ring-1 ring-blue-100 [.bbva-dark_&]:bg-cyan-300/10 [.bbva-dark_&]:ring-cyan-300/20' : 'hover:bg-slate-50 [.bbva-dark_&]:hover:bg-slate-800/70',
              )}
              aria-pressed={active}
              title={`${item.label}: ${item.value} (${percentage.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%)`}
            >
              {content}
            </button>
          ) : (
            <div key={item.key ?? item.label} className="flex items-center justify-between gap-3 px-2 py-1.5 text-[10.5px]" title={`${item.label}: ${item.value} (${percentage.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%)`}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
};
