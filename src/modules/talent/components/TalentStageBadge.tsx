import React from 'react';
import { TALENT_STAGE_LABELS, type TalentStage } from '../types/talent';

const stageClasses: Record<TalentStage, string> = {
  REGISTERED: 'border-slate-600/60 bg-slate-700/30 text-slate-700',
  ACADEMY: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  TRAINING: 'border-blue-500/30 bg-blue-500/10 text-blue-700',
  EVALUATION: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
  AVAILABLE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
  UNASSIGNED: 'border-rose-500/30 bg-rose-500/10 text-rose-700',
  CONVERTED: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
};

export const TalentStageBadge: React.FC<{ stage: TalentStage }> = ({ stage }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${stageClasses[stage]}`}>
    {TALENT_STAGE_LABELS[stage]}
  </span>
);
