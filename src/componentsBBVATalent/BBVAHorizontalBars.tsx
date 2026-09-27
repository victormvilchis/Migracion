import React from 'react';
import { cn } from '../lib/utils';
import { BBVAEmptyState } from './BBVAEmptyState';

export interface BBVAHorizontalBarItem {
  key: string;
  label: string;
  value: number;
}

interface BBVAHorizontalBarsProps {
  items: BBVAHorizontalBarItem[];
  max?: number;
  selectedKey?: string;
  onSelect?: (key: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const BBVAHorizontalBars: React.FC<BBVAHorizontalBarsProps> = ({
  items,
  max,
  selectedKey,
  onSelect,
  emptyTitle = 'Sin datos para los filtros actuales',
  emptyDescription = 'Ajusta los filtros para consultar otra distribución.',
}) => {
  if (!items.length) return <BBVAEmptyState compact title={emptyTitle} description={emptyDescription} />;
  const effectiveMax = max ?? Math.max(1, ...items.map((item) => item.value));
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-1.5">
      {items.slice(0, 10).map((item) => {
        const interactive = Boolean(onSelect && item.key);
        const active = Boolean(selectedKey && selectedKey === item.key);
        const percentage = total ? (item.value / total) * 100 : 0;
        const row = (
          <>
            <span className="truncate text-[10px] font-medium text-slate-600 [.bbva-dark_&]:text-slate-300">{item.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-slate-100 [.bbva-dark_&]:bg-slate-800">
              <span className={cn('block h-full rounded-full transition-[width]', active ? 'bg-blue-600 [.bbva-dark_&]:bg-cyan-300' : 'bg-blue-500')} style={{ width: `${Math.max(item.value > 0 ? 4 : 0, (item.value / Math.max(1, effectiveMax)) * 100)}%` }} />
            </span>
            <span className="text-right text-[10px] font-semibold tabular-nums text-slate-700 [.bbva-dark_&]:text-slate-200">{item.value}</span>
            <span className="text-right text-[9px] tabular-nums text-slate-400">{percentage.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%</span>
          </>
        );
        const className = cn(
          'grid w-full grid-cols-[minmax(110px,160px)_minmax(0,1fr)_34px_42px] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition',
          interactive ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25' : '',
          active ? 'bg-blue-50 ring-1 ring-blue-100 [.bbva-dark_&]:bg-cyan-300/10 [.bbva-dark_&]:ring-cyan-300/20' : interactive ? 'hover:bg-slate-50 [.bbva-dark_&]:hover:bg-slate-800/70' : '',
        );
        return interactive ? (
          <button key={`${item.key}-${item.label}`} type="button" onClick={() => onSelect?.(item.key)} className={className} aria-pressed={active} title={`${item.label}: ${item.value} (${percentage.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%)`}>
            {row}
          </button>
        ) : (
          <div key={`${item.key}-${item.label}`} className={className} title={`${item.label}: ${item.value} (${percentage.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%)`}>
            {row}
          </div>
        );
      })}
    </div>
  );
};
