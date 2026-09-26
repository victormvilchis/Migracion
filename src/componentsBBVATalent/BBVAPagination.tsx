import React from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

interface BBVAPaginationProps {
  total: number;
  page: number;
  size: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

export const BBVAPagination: React.FC<BBVAPaginationProps> = ({ total, page, size, onPageChange, onSizeChange }) => {
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, pageCount - 1);
  const start = total === 0 ? 0 : safePage * size + 1;
  const end = Math.min(total, (safePage + 1) * size);
  const windowStart = Math.max(0, Math.min(safePage - 1, pageCount - 3));
  const pages = Array.from({ length: Math.min(3, pageCount) }, (_, index) => windowStart + index).filter((value) => value < pageCount);

  const buttonClass = 'inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 text-[10px] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-300 [.bbva-dark_&]:hover:bg-slate-800';

  return (
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-2 py-1.5 text-[10px] text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:text-slate-400">
      <span>{start}–{end} de {total}</span>
      <div className="flex items-center gap-1">
        <button className={buttonClass} disabled={safePage === 0} onClick={() => onPageChange(0)} aria-label="Primera página"><ChevronsLeft className="h-3 w-3" /></button>
        <button className={buttonClass} disabled={safePage === 0} onClick={() => onPageChange(safePage - 1)} aria-label="Página anterior"><ChevronLeft className="h-3 w-3" /></button>
        {pages.map((item) => (
          <button
            key={item}
            className={`${buttonClass} ${item === safePage ? '!border-blue-300 !bg-blue-100 !font-semibold !text-blue-700 [.bbva-dark_&]:!border-blue-500/40 [.bbva-dark_&]:!bg-blue-500/20 [.bbva-dark_&]:!text-blue-200' : ''}`}
            onClick={() => onPageChange(item)}
          >
            {item + 1}
          </button>
        ))}
        <button className={buttonClass} disabled={safePage >= pageCount - 1} onClick={() => onPageChange(safePage + 1)} aria-label="Página siguiente"><ChevronRight className="h-3 w-3" /></button>
        <button className={buttonClass} disabled={safePage >= pageCount - 1} onClick={() => onPageChange(pageCount - 1)} aria-label="Última página"><ChevronsRight className="h-3 w-3" /></button>
      </div>
      <label className="flex items-center gap-1.5">
        <select
          value={size}
          onChange={(event) => onSizeChange(Number(event.target.value))}
          className="h-6 rounded-md border border-slate-300 bg-white px-2 text-[10px] text-slate-700 outline-none [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200"
        >
          {[10, 25, 50, 100].map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <span>por página</span>
      </label>
    </div>
  );
};
