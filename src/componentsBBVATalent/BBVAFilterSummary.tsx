import React from 'react';
import { X } from 'lucide-react';

export interface BBVAFilterSummaryItem {
  key: string;
  label: string;
  onRemove?: () => void;
}

export const BBVAFilterSummary: React.FC<{ items: BBVAFilterSummaryItem[]; prefix?: string }> = ({ items, prefix = 'Resultados filtrados' }) => {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtros activos">
      <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.04em] text-slate-400">{prefix}</span>
      {items.map((item) => (
        <span key={item.key} className="inline-flex h-6 items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 text-[9.5px] font-medium text-blue-700 [.bbva-dark_&]:border-cyan-300/20 [.bbva-dark_&]:bg-cyan-300/10 [.bbva-dark_&]:text-cyan-200">
          {item.label}
          {item.onRemove ? (
            <button type="button" onClick={item.onRemove} className="rounded-full p-0.5 transition hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 [.bbva-dark_&]:hover:bg-cyan-300/15" aria-label={`Quitar filtro ${item.label}`}>
              <X className="h-2.5 w-2.5" aria-hidden="true" />
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
};
