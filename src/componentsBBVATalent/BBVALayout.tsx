import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BBVAContextBar } from './BBVAContextBar';
import { BBVASidebar } from './BBVASidebar';
import { BBVAOperationFeedback } from './BBVAOperationFeedback';
import './bbvaResponsiveDensity.css';

export type BBVAThemeMode = 'light' | 'dark';

interface BBVALayoutProps {
  children: React.ReactNode;
  /**
   * BBVA is intentionally light by default. When the BFS global header exposes
   * its theme state to modules, pass that resolved value here. This keeps the
   * workspace isolated from any unrelated global `.dark` class in BaseBFS.
   */
  themeMode?: BBVAThemeMode;
}

const SIDEBAR_STORAGE_KEY = 'bbva.sidebar.collapsed';

export const BBVALayout: React.FC<BBVALayoutProps> = ({ children, themeMode }) => {
  const location = useLocation();
  const resolvedTheme = themeMode ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const isTalentBankRoute = /^\/bbva\/talent-bank(?:\/|$)/.test(location.pathname);
  const highDensityDesktopRoute =
    /^\/bbva\/collaborators(?:\/|$)/.test(location.pathname) ||
    /^\/bbva\/certifications\/tracking(?:\/|$)/.test(location.pathname) ||
    /^\/bbva\/certifications\/metrics(?:\/|$)/.test(location.pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div
      className={`bbva-workspace ${resolvedTheme === 'dark' ? 'bbva-dark' : 'bbva-light'}`}
      data-workspace="bbva"
      data-bbva-density-profile={isTalentBankRoute ? 'talent-bank-ultra' : highDensityDesktopRoute ? 'compact-plus' : 'standard'}
      data-bbva-theme={resolvedTheme}
      data-bbva-theme-source={themeMode ? 'module-prop' : 'global-preview'}
    >
      <BBVAOperationFeedback />
      <div className="bbva-shell flex min-h-[calc(100vh-4rem)] w-full bg-white text-slate-950 transition-colors duration-300 [.bbva-dark_&]:text-slate-100">
        <div className="bbva-sidebar-slot sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 lg:block">
          <BBVASidebar collapsed={collapsed} />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-[1100] lg:hidden">
            <button
              type="button"
              aria-label="Cerrar navegación"
              className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px] [.bbva-dark_&]:bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute bottom-0 left-0 top-16">
              <BBVASidebar mobile onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="bbva-main-shell min-w-0 flex-1 bg-white transition-colors duration-300 [.bbva-dark_&]:bg-[#020617]">
          <BBVAContextBar
            collapsed={collapsed}
            onToggleSidebar={() => {
              if (window.matchMedia('(min-width: 1024px)').matches) {
                setCollapsed((current) => !current);
              } else {
                setMobileOpen(true);
              }
            }}
          />

          <main className="bbva-main-surface w-full min-w-0 overflow-x-auto bg-white px-3 py-3 transition-colors duration-300 [.bbva-dark_&]:bg-[#020617] sm:px-4 sm:py-4">
            {children}
          </main>
        </div>

      </div>
    </div>
  );
};
