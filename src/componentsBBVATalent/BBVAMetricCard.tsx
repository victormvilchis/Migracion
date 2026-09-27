import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { BBVACard } from './BBVACard';
import { BBVADataHelp, type BBVADataHelpContent } from './BBVADataHelp';

export type BBVAMetricTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'orange' | 'violet' | 'slate';

const tones: Record<BBVAMetricTone, string> = {
  blue: 'border-blue-100 bg-blue-50 text-blue-700 [.bbva-dark_&]:border-blue-400/20 [.bbva-dark_&]:bg-blue-400/10 [.bbva-dark_&]:text-blue-300',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 [.bbva-dark_&]:border-emerald-400/20 [.bbva-dark_&]:bg-emerald-400/10 [.bbva-dark_&]:text-emerald-300',
  amber: 'border-amber-100 bg-amber-50 text-amber-700 [.bbva-dark_&]:border-amber-400/20 [.bbva-dark_&]:bg-amber-400/10 [.bbva-dark_&]:text-amber-300',
  rose: 'border-rose-100 bg-rose-50 text-rose-700 [.bbva-dark_&]:border-rose-400/20 [.bbva-dark_&]:bg-rose-400/10 [.bbva-dark_&]:text-rose-300',
  orange: 'border-orange-100 bg-orange-50 text-orange-700 [.bbva-dark_&]:border-orange-400/20 [.bbva-dark_&]:bg-orange-400/10 [.bbva-dark_&]:text-orange-300',
  violet: 'border-violet-100 bg-violet-50 text-violet-700 [.bbva-dark_&]:border-violet-400/20 [.bbva-dark_&]:bg-violet-400/10 [.bbva-dark_&]:text-violet-300',
  slate: 'border-slate-200 bg-slate-50 text-slate-700 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-300',
};

interface BBVAMetricCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: BBVAMetricTone;
  supportingText?: string;
  help?: BBVADataHelpContent;
  onAction?: () => void;
  actionLabel?: string;
  active?: boolean;
  className?: string;
}

export const BBVAMetricCard: React.FC<BBVAMetricCardProps> = ({
  label,
  value,
  icon,
  tone = 'blue',
  supportingText,
  help,
  onAction,
  actionLabel = 'Ver detalle',
  active = false,
  className,
}) => (
  <BBVACard
    className={cn(
      'flex min-h-[132px] flex-col rounded-2xl p-3',
      active && 'border-blue-400 ring-2 ring-blue-500/10 [.bbva-dark_&]:border-cyan-400/50 [.bbva-dark_&]:ring-cyan-300/10',
      className,
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', tones[tone])}>{icon}</span>
      {help ? <BBVADataHelp label={label} content={help} /> : <span className="h-6 w-6" aria-hidden="true" />}
    </div>
    <div className="mt-3 text-[9px] font-semibold uppercase leading-3 tracking-[0.05em] text-slate-400">{label}</div>
    <div className="mt-1 text-2xl font-semibold leading-none tabular-nums text-slate-950 [.bbva-dark_&]:text-slate-100">{value}</div>
    <div className="mt-auto flex min-h-[30px] items-end justify-between gap-2 pt-2">
      <div className="text-[9.5px] leading-3 text-slate-500 [.bbva-dark_&]:text-slate-400">{supportingText ?? ''}</div>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-[9.5px] font-semibold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25 [.bbva-dark_&]:text-cyan-300 [.bbva-dark_&]:hover:bg-cyan-300/10"
          aria-pressed={active || undefined}
        >
          {actionLabel}
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  </BBVACard>
);
