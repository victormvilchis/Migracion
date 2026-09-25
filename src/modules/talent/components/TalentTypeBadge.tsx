import React from 'react';
import { TALENT_TYPE_LABELS, type TalentType } from '../types/talent';

const typeClasses: Record<TalentType, string> = {
  ACADEMY: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700',
  PROSPECT: 'border-blue-500/30 bg-blue-500/10 text-blue-700',
  BBVA_EXIT: 'border-orange-500/30 bg-orange-500/10 text-orange-700',
};

export const TalentTypeBadge: React.FC<{ type: TalentType }> = ({ type }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${typeClasses[type]}`}>
    {TALENT_TYPE_LABELS[type]}
  </span>
);
