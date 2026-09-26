import React from 'react';
import { TALENT_TYPE_LABELS, type TalentType } from '../pagesBBVATalent/types/talent';

const typeClasses: Record<TalentType, string> = {
  ACADEMY: 'border-indigo-300 bg-indigo-50 text-indigo-700 [.bbva-dark_&]:border-indigo-500/30 [.bbva-dark_&]:bg-indigo-500/10 [.bbva-dark_&]:text-indigo-300',
  PROSPECT: 'border-blue-300 bg-blue-50 text-blue-700 [.bbva-dark_&]:border-blue-500/30 [.bbva-dark_&]:bg-blue-500/10 [.bbva-dark_&]:text-blue-300',
  BBVA_EXIT: 'border-orange-300 bg-orange-50 text-orange-700 [.bbva-dark_&]:border-orange-500/30 [.bbva-dark_&]:bg-orange-500/10 [.bbva-dark_&]:text-orange-300',
};

export const TalentTypeBadge: React.FC<{ type: TalentType }> = ({ type }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${typeClasses[type]}`}>
    {TALENT_TYPE_LABELS[type]}
  </span>
);
