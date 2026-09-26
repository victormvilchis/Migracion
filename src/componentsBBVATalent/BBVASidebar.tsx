import React from 'react';
import { NavLink } from 'react-router-dom';
import { BadgeCheck, UsersRound, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface BBVASidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

const items = [
  {
    to: '/bbva/talent-bank',
    label: 'Talent Bank',
    description: 'Academias, prospectos y desasignados',
    icon: UsersRound,
  },
  {
    to: '/bbva/collaborators',
    label: 'Colaboradores',
    description: 'Talento activo y seguimiento',
    icon: BadgeCheck,
  },
];

export const BBVASidebar: React.FC<BBVASidebarProps> = ({ mobile = false, onClose }) => {
  return (
    <aside
      className={cn(
        'flex h-full w-72 flex-col border-r border-slate-200 bg-white',
        mobile ? 'shadow-2xl' : 'shrink-0'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 lg:hidden">
        <span className="text-sm font-bold text-slate-900">Navegación</span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Cerrar navegación BBVA"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 px-4 py-5">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Gestión de talento
        </p>

        <nav className="space-y-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  )
                }
              >
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-white">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{item.description}</span>
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Próximamente</p>
          <div className="mt-2 space-y-1 px-3 text-xs text-slate-400">
            <div className="py-1">Certificaciones</div>
            <div className="py-1">Evaluaciones</div>
            <div className="py-1">Paths y desarrollo</div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl bg-slate-50 px-3 py-3 text-[11px] leading-4 text-slate-500">
          Dominio encapsulado para integración posterior en <span className="font-semibold text-slate-700">bfs_US</span>.
        </div>
      </div>
    </aside>
  );
};
