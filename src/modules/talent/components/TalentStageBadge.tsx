import React from 'react';
import { TALENT_STAGE_LABELS, type TalentStage } from '../types/talent';

const stageClasses: Record<TalentStage, string> = {
  PROSPECT: 'border-slate-600 bg-slate-700/30 text-slate-300',
  ACADEMY: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  TRAINING: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  EVALUATION: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  AVAILABLE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  UNASSIGNED: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  CONVERTED: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
};

export const TalentStageBadge: React.FC<{ stage: TalentStage }> = ({ stage }) => (
  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stageClasses[stage]}`}>
    {TALENT_STAGE_LABELS[stage]}
  </span>
);
