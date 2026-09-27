import React from 'react';
import { Inbox } from 'lucide-react';

interface BBVAEmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export const BBVAEmptyState: React.FC<BBVAEmptyStateProps> = ({ title, description, action, compact = false }) => (
  <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-3 py-5' : 'px-4 py-8'}`}>
    <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-800 [.bbva-dark_&]:text-slate-500">
      <Inbox className="h-4 w-4" aria-hidden="true" />
    </span>
    <div className="text-[10.5px] font-semibold text-slate-700 [.bbva-dark_&]:text-slate-200">{title}</div>
    {description ? <div className="mt-1 max-w-md text-[9.5px] leading-4 text-slate-500 [.bbva-dark_&]:text-slate-400">{description}</div> : null}
    {action ? <div className="mt-3">{action}</div> : null}
  </div>
);
