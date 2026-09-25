import React from 'react';
import { cn } from '../../lib/utils';

interface ServiceStatusBadgeProps {
  label: string;
  status: 'connected' | 'running' | 'disconnected' | 'mock' | 'loading' | 'error';
  subtitle?: string;
}

export const ServiceStatusBadge: React.FC<ServiceStatusBadgeProps> = ({
  label,
  status,
  subtitle,
}) => {
  const isGood = status === 'connected' || status === 'running';
  const isWarning = status === 'mock' || status === 'disconnected';
  const isLoading = status === 'loading';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200">
      <div
        className={cn(
          'w-2.5 h-2.5 rounded-full animate-pulse',
          isGood && 'bg-emerald-400 shadow-lg shadow-emerald-500/50',
          isWarning && 'bg-amber-400 shadow-lg shadow-amber-500/50',
          status === 'error' && 'bg-rose-400 shadow-lg shadow-rose-500/50',
          isLoading && 'bg-blue-400'
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">{label}</span>
          <span
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider',
              isGood && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
              status === 'mock' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
              status === 'disconnected' && 'bg-slate-700/50 text-slate-500 border border-slate-300',
              status === 'error' && 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
              isLoading && 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            )}
          >
            {status}
          </span>
        </div>
        {subtitle && <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};
