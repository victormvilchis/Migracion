import React, { useMemo } from 'react';
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

export const BBVAQuarterSelector: React.FC<Props> = ({ currentCode, selectedCode, referenceDate, progressPercent, daysToEnd, years, quarters, onChange }) => {
  const selected = quarters.find((item) => item.code === selectedCode) ?? quarters.find((item) => item.code === currentCode) ?? quarters[0] ?? null;
  const selectedYear = selected?.year ?? years[0] ?? new Date().getUTCFullYear();
  const yearQuarters = useMemo(() => quarters.filter((item) => item.year === selectedYear), [quarters, selectedYear]);
  const yearOptions = years.map((year) => ({ value: String(year), label: String(year) }));

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-cyan-50/70 shadow-sm [.bbva-dark_&]:border-cyan-400/20 [.bbva-dark_&]:from-blue-950/25 [.bbva-dark_&]:via-slate-900 [.bbva-dark_&]:to-cyan-950/20">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
        <div className="flex min-w-[210px] items-center gap-2">
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-700 shadow-sm [.bbva-dark_&]:border-blue-400/20 [.bbva-dark_&]:bg-blue-400/10 [.bbva-dark_&]:text-cyan-300">
            <CalendarDays className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" aria-hidden="true" />
          </span>
          <div>
            <div className="text-[8.5px] font-semibold uppercase tracking-[.08em] text-blue-600">Q actual · {currentCode ?? 'Sin configurar'}</div>
            <div className="mt-0.5 text-[10px] font-semibold text-slate-800 [.bbva-dark_&]:text-slate-100">Vista operativa: {selected?.code ?? 'Sin Q'}</div>
          </div>
        </div>

        <div className="w-[110px]">
          <BBVASearchableSelect
            value={String(selectedYear)}
            onChange={(value) => {
              const target = quarters.find((item) => item.year === Number(value) && item.quarter === selected?.quarter)
                ?? quarters.find((item) => item.year === Number(value));
              if (target) onChange(target.code);
            }}
            options={yearOptions}
            ariaLabel="Año de Q"
          />
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-1.5" role="group" aria-label="Seleccionar Q">
          {yearQuarters.map((item) => {
            const active = item.code === selected?.code;
            const current = item.code === currentCode;
            return <button key={item.code} type="button" onClick={() => onChange(item.code)} className={`relative min-w-[62px] rounded-xl border px-3 py-2 text-[10px] font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${active ? 'border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-600/15 -translate-y-px' : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-px hover:border-blue-300 hover:text-blue-700 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-300'}`}>Q{item.quarter}{current ? <span className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-300' : 'bg-emerald-500'} motion-safe:animate-pulse`} /> : null}</button>;
          })}
        </div>

        <div className="min-w-[220px] flex-1 xl:max-w-[360px]">
          <div className="flex items-center justify-between gap-3 text-[8.5px] font-medium text-slate-500"><span>{selected?.startDate ?? '—'} → {selected?.endDate ?? '—'}</span><span>{selected?.code === currentCode ? `${daysToEnd ?? 0} días restantes` : `Referencia ${referenceDate}`}</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80 [.bbva-dark_&]:bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700 ease-out" style={{ width: `${selected?.code === currentCode ? Math.max(2, Math.min(100, progressPercent ?? 0)) : 100}%` }} /></div>
        </div>
      </div>
    </section>
  );
};
