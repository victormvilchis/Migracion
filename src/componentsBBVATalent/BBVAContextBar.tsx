import React, { useMemo } from 'react';
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getBbvaBreadcrumbParts } from './bbvaNavigation';

interface BBVAContextBarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export const BBVAContextBar: React.FC<BBVAContextBarProps> = ({ collapsed, onToggleSidebar }) => {
  const location = useLocation();
  const parts = useMemo(() => getBbvaBreadcrumbParts(location.pathname), [location.pathname]);
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="bbva-context-bar sticky top-16 z-20 flex h-10 w-full items-center border-b border-slate-200/90 bg-white/95 px-3 backdrop-blur-xl transition-colors duration-300 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-[#020617]/[0.98] [.bbva-dark_&]:shadow-[0_8px_20px_rgba(0,0,0,0.18)] sm:px-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="mr-3 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 [.bbva-dark_&]:text-slate-400 [.bbva-dark_&]:hover:bg-slate-800 [.bbva-dark_&]:hover:text-white"
        aria-label={collapsed ? 'Expandir navegación' : 'Compactar navegación'}
        title={collapsed ? 'Expandir navegación' : 'Compactar navegación'}
      >
        <ToggleIcon className="h-4 w-4" />
      </button>

      <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-slate-400 [.bbva-dark_&]:text-slate-400" aria-label="Ruta de navegación">
        {parts.map((part, index) => {
          const current = index === parts.length - 1;
          return (
            <React.Fragment key={`${part.label}-${index}`}>
              {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-300 [.bbva-dark_&]:text-slate-700" />}
              {part.path && !current ? (
                <Link to={part.path} className="truncate rounded-sm transition hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 [.bbva-dark_&]:hover:text-cyan-300">
                  {part.label}
                </Link>
              ) : (
                <span className={current ? 'truncate font-semibold text-slate-800 [.bbva-dark_&]:text-slate-100' : 'truncate'} aria-current={current ? 'page' : undefined}>{part.label}</span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};
