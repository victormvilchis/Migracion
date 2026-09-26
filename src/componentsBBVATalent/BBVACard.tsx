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
      '[.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none',
      className
    )}
    {...props}
  >
    {children}
  </div>
);
