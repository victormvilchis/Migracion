import React from 'react';
import { Award, ArrowRightLeft, UserRoundCheck } from 'lucide-react';
import { BBVAEmptyState } from './BBVAEmptyState';
import type { DashboardResponse } from '../pagesBBVATalent/types/dashboard';

interface Props {
  items: DashboardResponse['activity'];
  onSelect?: (item: DashboardResponse['activity'][number]) => void;
  limit?: number;
}

const iconFor = (category: DashboardResponse['activity'][number]['category']) => category === 'CERTIFICATION' ? Award : category === 'TALENT' ? ArrowRightLeft : UserRoundCheck;
const labelFor = (category: DashboardResponse['activity'][number]['category']) => category === 'CERTIFICATION' ? 'Certificación' : category === 'TALENT' ? 'Banco de talento' : 'Colaborador';
const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export const BBVAActivityFeed: React.FC<Props> = ({ items, onSelect, limit = 8 }) => {
  const visible = items.slice(0, limit);
  if (!visible.length) return <BBVAEmptyState compact title="Sin actividad reciente" description="No existen movimientos registrados dentro del periodo seleccionado." />;
  return (
    <div className="divide-y divide-slate-100 [.bbva-dark_&]:divide-slate-800">
      {visible.map((item) => {
        const Icon = iconFor(item.category);
        const actionable = Boolean(onSelect && (item.collaboratorId || item.talentId));
        return (
          <button
            key={item.id}
            type="button"
            disabled={!actionable}
            onClick={() => actionable && onSelect?.(item)}
            className="flex w-full items-start gap-3 px-1 py-2.5 text-left transition enabled:hover:bg-slate-50 enabled:focus:outline-none enabled:focus-visible:ring-2 enabled:focus-visible:ring-blue-500/30 disabled:cursor-default [.bbva-dark_&]:enabled:hover:bg-slate-800/50"
          >
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-blue-700 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-cyan-300"><Icon className="h-3.5 w-3.5" /></span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5"><span className="text-[10px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{item.title}</span><span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-slate-500 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-400">{labelFor(item.category)}</span>{item.certificationName ? <span className="text-[8.5px] text-slate-400">· {item.certificationName.toLocaleUpperCase('es-MX')}</span> : null}</span><span className="mt-0.5 block text-[9.5px] leading-4 text-slate-600 [.bbva-dark_&]:text-slate-300">{item.description}</span><span className="mt-0.5 block text-[8.5px] text-slate-400">{formatDateTime(item.occurredAt)}</span></span>
          </button>
        );
      })}
    </div>
  );
};
