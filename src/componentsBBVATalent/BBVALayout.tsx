import React, { useState } from 'react';
import { BBVAHeader } from './BBVAHeader';
import { BBVASidebar } from './BBVASidebar';

interface BBVALayoutProps {
  children: React.ReactNode;
}

export const BBVALayout: React.FC<BBVALayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <BBVAHeader onOpenNavigation={() => setMobileOpen(true)} />

      <div className="flex min-h-[calc(100vh-4rem)]">
        <div className="hidden lg:block">
          <BBVASidebar />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Cerrar navegación"
              className="absolute inset-0 bg-slate-950/35"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[86vw]">
              <BBVASidebar mobile onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
};
