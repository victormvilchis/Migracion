import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export const BBVATableSortHeader: React.FC<{
  label: string;
  active?: boolean;
  direction?: 'asc' | 'desc';
  onClick: () => void;
  align?: 'left' | 'center' | 'right';
}> = ({ label, active = false, direction = 'asc', onClick, align = 'left' }) => {
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <button type="button" onClick={onClick} className={`inline-flex w-full items-center gap-1 ${justify} text-inherit hover:text-blue-700`} aria-label={`Ordenar por ${label}`}>
      <span>{label}</span><Icon className={`h-3 w-3 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
    </button>
  );
};
