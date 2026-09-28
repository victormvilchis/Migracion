import React from 'react';
import { CalendarDays } from 'lucide-react';
import { BBVASearchableSelect } from './BBVASearchableSelect';

export interface BBVAQuarterOption {
  code: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  startDate: string;
  endDate: string;
}

interface Props {
  currentCode: string | null;
  selectedCode: string | null;
  referenceDate: string;
  progressPercent: number | null;
  daysToEnd: number | null;
  years: number[];
  quarters: BBVAQuarterOption[];
  onChange: (code: string) => void;
}

const shortDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

export const BBVAQuarterSelector: React.FC<Props> = ({ currentCode, selectedCode, referenceDate, progressPercent, daysToEnd, quarters, onChange }) => {
  const selected = quarters.find((item) => item.code === selectedCode) ?? quarters.find((item) => item.code === currentCode) ?? quarters[0] ?? null;
  const options = quarters.map((item) => ({
    value: item.code,
    label: `${item.year} · Periodo ${item.quarter}${item.code === currentCode ? ' · Actual' : ''}`,
    description: `${shortDate(item.startDate)} → ${shortDate(item.endDate)}`,
  }));

  return (
    <section className="bbva-live-panel overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-cyan-50/70 shadow-sm [.bbva-dark_&]:border-cyan-400/20 [.bbva-dark_&]:from-blue-950/25 [.bbva-dark_&]:via-slate-900 [.bbva-dark_&]:to-cyan-950/20">
      <div className="grid items-center gap-3 px-3 py-2.5 lg:grid-cols-[minmax(210px,0.7fr)_minmax(260px,1fr)_minmax(240px,1.1fr)]">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-700 shadow-sm [.bbva-dark_&]:border-blue-400/20 [.bbva-dark_&]:bg-blue-400/10 [.bbva-dark_&]:text-cyan-300">
            <CalendarDays className="h-4 w-4" />
            <span className="bbva-live-dot absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
          </span>
          <div>
            <div className="text-[8.5px] font-semibold uppercase tracking-[.08em] text-blue-600">Periodo actual · {currentCode ? currentCode.replace('Q', ' · P') : 'Sin configurar'}</div>
            <div className="mt-0.5 text-[10.5px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Analizando {selected ? `Periodo ${selected.quarter} · ${selected.year}` : 'Sin periodo'}</div>
          </div>
        </div>

        <BBVASearchableSelect
          value={selected?.code ?? ''}
          onChange={onChange}
          options={options}
          ariaLabel="Periodo"
          searchPlaceholder="Buscar periodo"
          emptyMessage="No hay periodos configurados."
        />

        <div>
          <div className="flex items-center justify-between gap-3 text-[8.5px] font-medium text-slate-500">
            <span>{selected?.startDate ?? '—'} → {selected?.endDate ?? '—'}</span>
            <span>{selected?.code === currentCode ? `${daysToEnd ?? 0} días restantes` : `Referencia ${referenceDate}`}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200/80 [.bbva-dark_&]:bg-slate-700">
            <div className="bbva-quarter-progress h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" style={{ width: `${selected?.code === currentCode ? Math.max(2, Math.min(100, progressPercent ?? 0)) : 100}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
};
