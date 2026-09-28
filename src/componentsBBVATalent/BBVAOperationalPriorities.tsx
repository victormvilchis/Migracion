import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { DashboardInsightTone, DashboardOperationalPriority, DashboardOperationalStatus } from '../pagesBBVATalent/lib/dashboardInsights';

interface BBVAOperationalPrioritiesProps {
  items: DashboardOperationalPriority[];
  onSelect: (status: DashboardOperationalStatus) => void;
}

const tones: Record<DashboardInsightTone, string> = {
  rose: 'bg-rose-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  slate: 'bg-slate-500',
};

export const BBVAOperationalPriorities: React.FC<BBVAOperationalPrioritiesProps> = ({ items, onSelect }) => (
  <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 [.bbva-dark_&]:divide-slate-800 [.bbva-dark_&]:border-slate-800">
    {items.map((item) => (
      <button
        key={item.key}
        type="button"
        onClick={() => onSelect(item.key)}
        className="grid w-full grid-cols-[8px_minmax(0,1fr)_auto_20px] items-center gap-3 bg-white px-3 py-2.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/25 [.bbva-dark_&]:bg-slate-900/60 [.bbva-dark_&]:hover:bg-slate-800/70"
        aria-label={`${item.label}: ${item.value} certificaciones, ${item.peopleAffected} personas`}
      >
        <span className={cn('h-7 w-1.5 rounded-full', tones[item.tone])} aria-hidden="true" />
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[10.5px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{item.label}</span>
            <span className="text-[9px] text-slate-400">{item.context}</span>
          </span>
          <span className="mt-0.5 block text-[9px] text-slate-500 [.bbva-dark_&]:text-slate-400">
            {item.peopleAffected} {item.peopleAffected === 1 ? 'persona afectada' : 'personas afectadas'}
          </span>
        </span>
        <span className="text-right text-lg font-semibold tabular-nums text-slate-950 [.bbva-dark_&]:text-slate-100">{item.value}</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300 [.bbva-dark_&]:text-slate-600" aria-hidden="true" />
      </button>
    ))}
  </div>
);
