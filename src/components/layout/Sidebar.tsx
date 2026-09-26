import React from 'react';
import { NavLink } from 'react-router-dom';
import { Bot, Building2, Database, Layers, LayoutDashboard } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const businessItems = [
    {
      to: '/bbva/dashboard',
      label: 'BBVA Workspace',
      icon: Building2,
      description: 'Talento, certificaciones y desarrollo',
    },
  ];

  const navItems = [
    {
      to: '/',
      label: 'Panel principal',
      icon: LayoutDashboard,
      description: 'Estado de servicios y bienvenida',
    },
    {
      to: '/crud',
      label: 'Gestión SQL (CRUD)',
      icon: Database,
      description: 'Prueba local de SQL Server',
    },
    {
      to: '/ai',
      label: 'Asistente IA',
      icon: Bot,
      description: 'Azure OpenAI y simulación',
    },
  ];

  return (
    <aside className="flex min-h-[calc(100vh-4rem)] w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4">
      <div className="space-y-6">
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Módulos base</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'border border-blue-500/30 bg-blue-600/15 text-blue-500 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span>{item.label}</span>
                    <span className="text-[10px] font-normal text-slate-500">{item.description}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Negocio</p>
          <nav className="space-y-1">
            {businessItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'border border-blue-500/30 bg-blue-600/15 text-blue-500 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span>{item.label}</span>
                    <span className="text-[10px] font-normal text-slate-500">{item.description}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Arquitectura Softtek</p>
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span>Contrato tecnológico</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Integración modular compatible con <code className="text-blue-500">bfs_US</code>.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="font-mono text-[11px]">Node v22.22.2</span>
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-600">Verificado</span>
        </div>
        <p className="text-[10px] text-slate-500">
          Revisa <strong className="text-slate-600">GUIA_INTEGRACION_BFS_US.md</strong> para el flujo de entrega a producción.
        </p>
      </div>
    </aside>
  );
};
