import React from 'react';
import { TALENT_STAGE_LABELS, type TalentStage } from '../pagesBBVATalent/types/talent';

const stageClasses: Record<TalentStage, string> = {
  REGISTERED: 'border-slate-300 bg-slate-100 text-slate-700 [.bbva-dark_&]:border-slate-600 [.bbva-dark_&]:bg-slate-700/35 [.bbva-dark_&]:text-slate-200',
  ACADEMY: 'border-violet-300 bg-violet-50 text-violet-700 [.bbva-dark_&]:border-violet-500/30 [.bbva-dark_&]:bg-violet-500/10 [.bbva-dark_&]:text-violet-300',
  TRAINING: 'border-blue-300 bg-blue-50 text-blue-700 [.bbva-dark_&]:border-blue-500/30 [.bbva-dark_&]:bg-blue-500/10 [.bbva-dark_&]:text-blue-300',
  EVALUATION: 'border-amber-300 bg-amber-50 text-amber-700 [.bbva-dark_&]:border-amber-500/30 [.bbva-dark_&]:bg-amber-500/10 [.bbva-dark_&]:text-amber-300',
  AVAILABLE: 'border-emerald-300 bg-emerald-50 text-emerald-700 [.bbva-dark_&]:border-emerald-500/30 [.bbva-dark_&]:bg-emerald-500/10 [.bbva-dark_&]:text-emerald-300',
  UNASSIGNED: 'border-rose-300 bg-rose-50 text-rose-700 [.bbva-dark_&]:border-rose-500/30 [.bbva-dark_&]:bg-rose-500/10 [.bbva-dark_&]:text-rose-300',
  CONVERTED: 'border-cyan-300 bg-cyan-50 text-cyan-700 [.bbva-dark_&]:border-cyan-500/30 [.bbva-dark_&]:bg-cyan-500/10 [.bbva-dark_&]:text-cyan-300',
};

export const TalentStageBadge: React.FC<{ stage: TalentStage }> = ({ stage }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${stageClasses[stage]}`}>
    {TALENT_STAGE_LABELS[stage]}
  </span>
);
