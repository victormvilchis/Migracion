import React from 'react';
import { cn } from '../lib/utils';

interface BBVAFilterBarProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Barra estándar de filtros BBVA: compacta, sin contenedor/card propio y
 * separada de la tabla. Los controles definen su ancho desde cada módulo.
 */
export const BBVAFilterBar: React.FC<BBVAFilterBarProps> = ({ children, actions, className }) => (
  <div className={cn('flex flex-wrap items-center gap-2', className)}>
    {children}
    {actions ? <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div> : null}
  </div>
);
