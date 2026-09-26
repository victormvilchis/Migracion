import React from 'react';
import { Menu, ShieldCheck } from 'lucide-react';

interface BBVAHeaderProps {
  onOpenNavigation?: () => void;
}

export const BBVAHeader: React.FC<BBVAHeaderProps> = ({ onOpenNavigation }) => {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex h-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenNavigation}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
            aria-label="Abrir navegación BBVA"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-sm font-black text-white shadow-sm">
            B
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold tracking-tight text-slate-950 sm:text-base">
                BBVA Talent Management
              </h1>
              <span className="hidden rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 sm:inline-flex">
                BFS
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-500">Gestión de talento, colaboradores y certificaciones</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 md:flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Módulo BBVA aislado</span>
        </div>
      </div>
    </header>
  );
};
