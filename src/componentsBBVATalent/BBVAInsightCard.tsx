import React from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, Clock3, RefreshCw, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import type { DashboardInsightTone } from '../pagesBBVATalent/lib/dashboardInsights';

interface BBVAInsightCardProps {
  eyebrow: string;
  title: string;
  description: string;
  tone?: DashboardInsightTone;
  actionLabel?: string;
  onAction?: () => void;
}

const tones: Record<DashboardInsightTone, { shell: string; icon: string; Icon: React.ComponentType<{ className?: string }> }> = {
  rose: {
    shell: 'border-rose-200 bg-rose-50/60 [.bbva-dark_&]:border-rose-500/20 [.bbva-dark_&]:bg-rose-500/5',
    icon: 'bg-rose-100 text-rose-700 [.bbva-dark_&]:bg-rose-400/10 [.bbva-dark_&]:text-rose-300',
    Icon: ShieldAlert,
  },
  orange: {
    shell: 'border-orange-200 bg-orange-50/60 [.bbva-dark_&]:border-orange-500/20 [.bbva-dark_&]:bg-orange-500/5',
    icon: 'bg-orange-100 text-orange-700 [.bbva-dark_&]:bg-orange-400/10 [.bbva-dark_&]:text-orange-300',
    Icon: RefreshCw,
  },
  amber: {
    shell: 'border-amber-200 bg-amber-50/60 [.bbva-dark_&]:border-amber-500/20 [.bbva-dark_&]:bg-amber-500/5',
    icon: 'bg-amber-100 text-amber-700 [.bbva-dark_&]:bg-amber-400/10 [.bbva-dark_&]:text-amber-300',
    Icon: Clock3,
  },
  blue: {
    shell: 'border-blue-200 bg-blue-50/60 [.bbva-dark_&]:border-blue-500/20 [.bbva-dark_&]:bg-blue-500/5',
    icon: 'bg-blue-100 text-blue-700 [.bbva-dark_&]:bg-blue-400/10 [.bbva-dark_&]:text-blue-300',
    Icon: AlertCircle,
  },
  emerald: {
    shell: 'border-emerald-200 bg-emerald-50/60 [.bbva-dark_&]:border-emerald-500/20 [.bbva-dark_&]:bg-emerald-500/5',
    icon: 'bg-emerald-100 text-emerald-700 [.bbva-dark_&]:bg-emerald-400/10 [.bbva-dark_&]:text-emerald-300',
    Icon: CheckCircle2,
  },
  slate: {
    shell: 'border-slate-200 bg-slate-50/70 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-800/60',
    icon: 'bg-slate-200 text-slate-700 [.bbva-dark_&]:bg-slate-700 [.bbva-dark_&]:text-slate-200',
    Icon: AlertCircle,
  },
};

export const BBVAInsightCard: React.FC<BBVAInsightCardProps> = ({ eyebrow, title, description, tone = 'blue', actionLabel, onAction }) => {
  const config = tones[tone];
  const Icon = config.Icon;
  return (
    <article className={cn('flex min-h-[148px] flex-col rounded-2xl border p-3.5 transition hover:-translate-y-px hover:shadow-sm', config.shell)}>
      <div className="flex items-start gap-3">
        <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', config.icon)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-[8.5px] font-semibold uppercase tracking-[0.06em] text-slate-500 [.bbva-dark_&]:text-slate-400">{eyebrow}</div>
          <h3 className="mt-1 text-[11px] font-semibold leading-4 text-slate-950 [.bbva-dark_&]:text-slate-100">{title}</h3>
        </div>
      </div>
      <p className="mt-3 text-[9.5px] leading-4 text-slate-600 [.bbva-dark_&]:text-slate-300">{description}</p>
      {onAction && actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-auto inline-flex w-fit items-center gap-1 rounded-lg px-1.5 py-1.5 text-[9.5px] font-semibold text-blue-700 transition hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25 [.bbva-dark_&]:text-cyan-300 [.bbva-dark_&]:hover:bg-white/5"
        >
          {actionLabel}<ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      ) : null}
    </article>
  );
};
