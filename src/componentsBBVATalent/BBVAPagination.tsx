import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { BBVASearchableSelect } from './BBVASearchableSelect';

interface BBVAPaginationProps {
  total: number;
  page: number;
  size: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

const buttonBase = 'inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800';

export const BBVAPagination: React.FC<BBVAPaginationProps> = ({ total, page, size, onPageChange, onSizeChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, totalPages - 1);
  const visibleCount = Math.min(7, totalPages);
  const half = Math.floor(visibleCount / 2);
  let start = Math.max(0, currentPage - half);
  if (start + visibleCount > totalPages) start = Math.max(0, totalPages - visibleCount);
  const pagesToRender = Array.from({ length: visibleCount }, (_, index) => start + index);

  return (
    <div className="flex flex-col gap-2 border-t border-slate-200 px-3 py-1.5 [.bbva-dark_&]:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-[10px] text-slate-500 [.bbva-dark_&]:text-slate-400">{total} registro{total === 1 ? '' : 's'}</div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onPageChange(0)} disabled={currentPage === 0} className={buttonBase} aria-label="Primera página"><ChevronsLeft className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => onPageChange(Math.max(currentPage - 1, 0))} disabled={currentPage === 0} className={buttonBase} aria-label="Página anterior"><ChevronLeft className="h-3.5 w-3.5" /></button>
          {pagesToRender.map((index) => {
            const active = index === currentPage;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onPageChange(index)}
                className={`${buttonBase} ${active ? '!border-blue-600 !bg-blue-600 !text-white shadow-sm ring-2 ring-blue-100 hover:!bg-blue-700 [.bbva-dark_&]:!border-blue-400 [.bbva-dark_&]:!bg-blue-500 [.bbva-dark_&]:!text-white [.bbva-dark_&]:ring-blue-500/20' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {index + 1}
              </button>
            );
          })}
          <button type="button" onClick={() => onPageChange(Math.min(currentPage + 1, totalPages - 1))} disabled={currentPage >= totalPages - 1} className={buttonBase} aria-label="Página siguiente"><ChevronRight className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => onPageChange(totalPages - 1)} disabled={currentPage >= totalPages - 1} className={buttonBase} aria-label="Última página"><ChevronsRight className="h-3.5 w-3.5" /></button>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 [.bbva-dark_&]:text-slate-400">
          <span>Por página</span>
          <div className="min-w-[112px]"><BBVASearchableSelect value={String(size)} onChange={(value) => onSizeChange(Number(value))} options={[10, 25, 50, 100].map((item) => ({ value: String(item), label: String(item) }))} ariaLabel="Tamaño de página" searchPlaceholder="Buscar tamaño" /></div>
        </div>
      </div>
    </div>
  );
};
