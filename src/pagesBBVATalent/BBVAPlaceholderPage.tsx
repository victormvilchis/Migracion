import React, { useMemo } from 'react';
import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { findBbvaGroupByPath, findBbvaNavigationMatch } from '../componentsBBVATalent/bbvaNavigation';

const BBVAPlaceholderPage: React.FC = () => {
  const location = useLocation();
  const match = useMemo(() => findBbvaNavigationMatch(location.pathname), [location.pathname]);
  const group = useMemo(() => findBbvaGroupByPath(location.pathname), [location.pathname]);
  const title = match?.module.label ?? group?.label ?? 'Módulo BBVA';

  return (
    <div className="flex min-h-[56vh] items-center justify-center animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm transition-colors duration-300 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900/70 [.bbva-dark_&]:shadow-none">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 [.bbva-dark_&]:bg-blue-500/10 [.bbva-dark_&]:text-blue-300">
          <Construction className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900 [.bbva-dark_&]:text-slate-100">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 [.bbva-dark_&]:text-slate-400">
          La navegación ya está preparada. La funcionalidad se incorporará siguiendo el patrón modular BBVA → bfs_US.
        </p>
      </div>
    </div>
  );
};

export default BBVAPlaceholderPage;
