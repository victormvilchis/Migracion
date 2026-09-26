import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Database, Bot, Layers, Building2 } from 'lucide-react';
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
      label: 'Panel Principal',
      icon: LayoutDashboard,
      description: 'Estado de servicios y bienvenida',
    },
    {
      to: '/crud',
      label: 'Gestión SQL (CRUD)',
      icon: Database,
      description: 'Prueba de SQL Server local',
    },
    {
      to: '/ai',
      label: 'Asistente AI',
      icon: Bot,
      description: 'Azure OpenAI & Simulación',
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Módulos Base
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span>{item.label}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{item.description}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Negocio
          </p>
          <nav className="space-y-1">
            {businessItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span>{item.label}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{item.description}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Arquitectura Softtek
          </p>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Contrato de Stack</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Diseñado para construir módulos independientes y moverlos a <code className="text-blue-400">bfs_US</code> sin cambios estructurales.
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="font-mono text-[11px]">Node v22.22.2</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
            Verified
          </span>
        </div>
        <p className="text-[10px] text-slate-500">
          Revisa <strong className="text-slate-500">GUIA_INTEGRACION_BFS_US.md</strong> para el flujo de entrega a producción.
        </p>
      </div>
    </aside>
  );
};
