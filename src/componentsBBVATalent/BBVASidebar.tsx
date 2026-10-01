import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Circle, X } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { bbvaNavigation, findBbvaNavigationMatch } from './bbvaNavigation';

interface BBVASidebarProps {
  collapsed?: boolean;
  mobile?: boolean;
  onClose?: () => void;
}

export const BBVASidebar: React.FC<BBVASidebarProps> = ({ collapsed = false, mobile = false, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeMatch = useMemo(() => findBbvaNavigationMatch(location.pathname), [location.pathname]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeMatch) return;
    setOpenGroups((current) => ({ ...current, [activeMatch.group.id]: true }));
    if (activeMatch.section) {
      setOpenSections((current) => ({ ...current, [activeMatch.section!.id]: true }));
    }
  }, [activeMatch]);

  const toggleGroup = (id: string) => setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  const toggleSection = (id: string) => setOpenSections((current) => ({ ...current, [id]: !current[id] }));

  const handleGroupClick = (group: (typeof bbvaNavigation)[number]) => {
    if (group.path) {
      navigate(group.path);
      onClose?.();
      return;
    }

    if (collapsed && !mobile) {
      const firstModule = group.modules?.[0] ?? group.sections?.[0]?.modules[0];
      if (firstModule) navigate(firstModule.path);
      return;
    }

    toggleGroup(group.id);
  };

  return (
    <aside
      className={cn(
        'bbva-sidebar flex h-[calc(100vh-4rem)] flex-col border-r transition-[width,background-color,border-color,color] duration-300',
        'border-slate-200 bg-white text-slate-900 shadow-xs',
        '[.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-[#020617] [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:shadow-none',
        mobile ? 'bbva-sidebar--mobile w-[220px] shadow-2xl' : collapsed ? 'bbva-sidebar--collapsed w-[58px]' : 'bbva-sidebar--expanded w-[206px]'
      )}
    >
      <div
        className={cn(
          'bbva-sidebar-header flex h-10 items-center border-b border-slate-200 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-[#020617]',
          collapsed && !mobile ? 'justify-center px-2' : 'justify-between px-3'
        )}
      >
        {collapsed && !mobile ? (
          <div
            className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-700 [.bbva-dark_&]:border-white/10 [.bbva-dark_&]:bg-white/10 [.bbva-dark_&]:text-white"
            title="BBVA Workspace"
          >
            BW
          </div>
        ) : (
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-white">BBVA Workspace</div>
            
          </div>
        )}

        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 [.bbva-dark_&]:hover:bg-white/10 [.bbva-dark_&]:hover:text-white"
            aria-label="Cerrar navegación"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 py-2 [scrollbar-width:thin] [scrollbar-color:#94a3b8_transparent] [.bbva-dark_&]:[scrollbar-color:#475569_transparent]">
        <nav className="space-y-0.5" aria-label="Navegación BBVA">
          {bbvaNavigation.map((group) => {
            const Icon = group.icon;
            const groupOpen = Boolean(openGroups[group.id]);
            const groupActive = activeMatch?.group.id === group.id || location.pathname === group.path;
            const hasChildren = Boolean(group.modules?.length || group.sections?.length);

            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => handleGroupClick(group)}
                  className={cn(
                    'bbva-sidebar-group group relative flex h-8 w-full items-center rounded-md border text-left text-[11px] font-semibold transition-all duration-200',
                    collapsed && !mobile ? 'justify-center px-0' : 'gap-2 px-2',
                    groupActive
                      ? 'border-blue-200/80 bg-blue-50/80 text-blue-950 [.bbva-dark_&]:border-white/10 [.bbva-dark_&]:bg-white/10 [.bbva-dark_&]:text-white'
                      : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 [.bbva-dark_&]:text-slate-300 [.bbva-dark_&]:hover:bg-white/[0.06] [.bbva-dark_&]:hover:text-white'
                  )}
                  title={collapsed && !mobile ? group.label : undefined}
                  aria-expanded={hasChildren ? groupOpen : undefined}
                >
                  {groupActive && <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-blue-600 [.bbva-dark_&]:bg-cyan-400" />}
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', groupActive ? 'text-blue-600 [.bbva-dark_&]:text-cyan-300' : 'text-slate-400 [.bbva-dark_&]:text-slate-500')} />
                  {(!collapsed || mobile) && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{group.label}</span>
                      {hasChildren && (
                        <ChevronDown className={cn('h-3 w-3 text-slate-400 transition-transform', groupOpen && 'rotate-180')} />
                      )}
                    </>
                  )}
                </button>

                {!collapsed && groupOpen && group.modules && (
                  <div className="ml-3.5 border-l border-slate-200 py-0.5 pl-2 [.bbva-dark_&]:border-white/10">
                    {group.modules.map((module) => (
                      <NavLink
                        key={module.id}
                        to={module.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'bbva-sidebar-link flex min-h-7 items-center gap-2 rounded-md px-2 text-[10.5px] transition',
                            isActive || location.pathname.startsWith(`${module.path}/`)
                              ? 'bg-blue-50 font-semibold text-blue-950 [.bbva-dark_&]:bg-white/10 [.bbva-dark_&]:text-white'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 [.bbva-dark_&]:text-slate-400 [.bbva-dark_&]:hover:bg-white/[0.05] [.bbva-dark_&]:hover:text-slate-200'
                          )
                        }
                      >
                        <Circle className="h-1.5 w-1.5 shrink-0 fill-current stroke-0 opacity-70" />
                        <span className="truncate">{module.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}

                {!collapsed && groupOpen && group.sections && (
                  <div className="ml-3.5 border-l border-slate-200 py-0.5 pl-2 [.bbva-dark_&]:border-white/10">
                    {group.sections.map((section) => {
                      const sectionOpen = Boolean(openSections[section.id]);
                      const sectionActive = activeMatch?.section?.id === section.id;

                      return (
                        <div key={section.id} className="py-px">
                          <button
                            type="button"
                            onClick={() => toggleSection(section.id)}
                            className={cn(
                              'bbva-sidebar-section flex min-h-7 w-full items-center gap-1.5 rounded-md px-1.5 text-left text-[10px] font-medium transition',
                              sectionActive
                                ? 'text-slate-900 [.bbva-dark_&]:text-white'
                                : 'text-slate-500 hover:text-slate-900 [.bbva-dark_&]:text-slate-500 [.bbva-dark_&]:hover:text-slate-300'
                            )}
                          >
                            {sectionOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            <span className="truncate">{section.label}</span>
                          </button>

                          {sectionOpen && (
                            <div className="ml-2.5 border-l border-slate-200 pl-1.5 [.bbva-dark_&]:border-white/[0.08]">
                              {section.modules.map((module) => (
                                <NavLink
                                  key={module.id}
                                  to={module.path}
                                  onClick={onClose}
                                  className={({ isActive }) =>
                                    cn(
                                      'bbva-sidebar-link bbva-sidebar-link--nested flex min-h-7 items-center gap-1.5 rounded-md px-2 text-[10px] transition',
                                      isActive || location.pathname.startsWith(`${module.path}/`)
                                        ? 'bg-blue-50 font-semibold text-blue-950 [.bbva-dark_&]:bg-white/10 [.bbva-dark_&]:text-white'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 [.bbva-dark_&]:text-slate-500 [.bbva-dark_&]:hover:bg-white/[0.05] [.bbva-dark_&]:hover:text-slate-300'
                                    )
                                  }
                                >
                                  <Circle className="h-1.5 w-1.5 shrink-0 fill-current stroke-0 opacity-70" />
                                  <span className="truncate">{module.label}</span>
                                </NavLink>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
