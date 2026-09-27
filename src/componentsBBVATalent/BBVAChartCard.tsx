import React from 'react';
import { BBVACard } from './BBVACard';

interface BBVAChartCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const BBVAChartCard: React.FC<BBVAChartCardProps> = ({ title, description, action, children, className = '' }) => (
  <BBVACard className={`rounded-2xl p-4 ${className}`.trim()}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-950 [.bbva-dark_&]:text-slate-100">{title}</h2>
        {description ? <p className="mt-0.5 text-[9.5px] leading-4 text-slate-500 [.bbva-dark_&]:text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
    {children}
  </BBVACard>
);
