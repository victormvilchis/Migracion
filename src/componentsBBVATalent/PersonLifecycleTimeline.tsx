import React from 'react';
import { ArrowRightLeft, Briefcase, Circle, UsersRound } from 'lucide-react';
import type { PersonLifecycleEvent, PersonLifecycleSource } from '../pagesBBVATalent/types/lifecycle';

interface PersonLifecycleTimelineProps {
  items: PersonLifecycleEvent[];
  loading?: boolean;
  emptyMessage?: string;
}

const sourceLabel: Record<PersonLifecycleSource, string> = {
  LIFECYCLE: 'Ciclo de vida',
  COLLABORATOR: 'Colaboradores',
  TALENT_BANK: 'Banco de talento',
};

const stateLabel = {
  TALENT_BANK: 'Banco de talento',
  COLLABORATOR: 'Colaboradores',
} as const;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SourceIcon({ source }: { source: PersonLifecycleSource }) {
  if (source === 'LIFECYCLE') return <ArrowRightLeft className="h-3.5 w-3.5" />;
  if (source === 'COLLABORATOR') return <Briefcase className="h-3.5 w-3.5" />;
  if (source === 'TALENT_BANK') return <UsersRound className="h-3.5 w-3.5" />;
  return <Circle className="h-3.5 w-3.5" />;
}

export const PersonLifecycleTimeline: React.FC<PersonLifecycleTimelineProps> = ({ items, loading = false, emptyMessage = 'Aún no hay actividad registrada.' }) => {
  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-[11px] text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando historial...</div>;
  }

  if (!items.length) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-[11px] text-slate-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900/60 [.bbva-dark_&]:text-slate-400">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
      <div className="divide-y divide-slate-200 [.bbva-dark_&]:divide-slate-800">
        {items.map((item) => {
          const effective = formatDate(item.effectiveDate);
          return (
            <div key={`${item.source}-${item.id}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
              <div>
                <div className="text-[10px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{formatDateTime(item.createdAt)}</div>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-400"><SourceIcon source={item.source} />{sourceLabel[item.source]}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold leading-5 text-slate-900 [.bbva-dark_&]:text-slate-100">{item.description}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 [.bbva-dark_&]:text-slate-400">
                  {item.fromState && item.toState ? <span>{stateLabel[item.fromState]} → {stateLabel[item.toState]}</span> : null}
                  {item.reasonName ? <span>Motivo: {item.reasonName}</span> : null}
                  {effective ? <span>Fecha efectiva: {effective}</span> : null}
                  {item.createdByEmail ? <span>Por: {item.createdByEmail}</span> : null}
                </div>
                {item.notes ? <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10.5px] leading-5 text-slate-600 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-950/40 [.bbva-dark_&]:text-slate-300">{item.notes}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
