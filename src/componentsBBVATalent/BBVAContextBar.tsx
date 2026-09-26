import React, { useMemo } from 'react';
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { findBbvaGroupByPath, findBbvaNavigationMatch, getBbvaBreadcrumbAction } from './bbvaNavigation';

interface BBVAContextBarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export const BBVAContextBar: React.FC<BBVAContextBarProps> = ({ collapsed, onToggleSidebar }) => {
  const location = useLocation();
  const match = useMemo(() => findBbvaNavigationMatch(location.pathname), [location.pathname]);
  const directGroup = useMemo(() => findBbvaGroupByPath(location.pathname), [location.pathname]);
  const action = useMemo(() => getBbvaBreadcrumbAction(location.pathname), [location.pathname]);
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  const parts = useMemo(() => {
    if (directGroup) return [directGroup.label];
    if (!match) return [];
    const values = [match.group.label];
    if (match.section) values.push(match.section.label);
    values.push(match.module.label);
    if (action) values.push(action);
    return values;
  }, [action, directGroup, match]);

  return (
    <div className="sticky top-16 z-20 flex h-10 w-full items-center border-b border-slate-200/90 bg-white/95 px-3 backdrop-blur-xl transition-colors duration-300 [.bbva-dark_&]:border-white/10 [.bbva-dark_&]:bg-slate-950/90 sm:px-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="mr-3 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 [.bbva-dark_&]:text-slate-400 [.bbva-dark_&]:hover:bg-slate-800 [.bbva-dark_&]:hover:text-white"
        aria-label={collapsed ? 'Expandir navegación' : 'Compactar navegación'}
        title={collapsed ? 'Expandir navegación' : 'Compactar navegación'}
      >
        <ToggleIcon className="h-4 w-4" />
      </button>

      <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-slate-400 [.bbva-dark_&]:text-slate-500" aria-label="Ruta de navegación">
        {parts.map((part, index) => (
          <React.Fragment key={`${part}-${index}`}>
            {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-300 [.bbva-dark_&]:text-slate-700" />}
            <span className={index === parts.length - 1 ? 'truncate font-semibold text-slate-800 [.bbva-dark_&]:text-slate-100' : 'truncate'}>{part}</span>
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
};
