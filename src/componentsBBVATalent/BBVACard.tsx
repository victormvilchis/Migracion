import React from 'react';
import { cn } from '../lib/utils';

interface BBVACardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Superficie visual propiedad del módulo BBVA.
 * No administra el tema: hereda Light/Dark del shell global BFS mediante la clase `dark`.
 */
export const BBVACard: React.FC<BBVACardProps> = ({ children, className, ...props }) => (
  <div
    className={cn(
      'rounded-xl border border-slate-200 bg-white shadow-sm transition-colors duration-300',
      '[.bbva-dark_&]:border-slate-700/80 [.bbva-dark_&]:bg-[#111c2e]/95 [.bbva-dark_&]:shadow-[0_10px_26px_rgba(0,0,0,0.16)]',
      className
    )}
    {...props}
  >
    {children}
  </div>
);
