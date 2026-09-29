import React from 'react';
import { cn } from '../lib/utils';

interface BBVAFilterBarProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

function containsSearchField(node: React.ReactNode): boolean {
  if (!React.isValidElement(node)) return false;
  const props = node.props as { children?: React.ReactNode; placeholder?: string; type?: string };
  if (typeof props.placeholder === 'string' && /^buscar\b/i.test(props.placeholder.trim())) return true;
  return React.Children.toArray(props.children).some(containsSearchField);
}

/**
 * Barra estándar de filtros BBVA.
 * - ocupa siempre todo el ancho disponible;
 * - si existe un buscador, éste absorbe el espacio sobrante antes que dejar huecos;
 * - acciones quedan integradas al extremo derecho.
 */
export const BBVAFilterBar: React.FC<BBVAFilterBarProps> = ({ children, actions, className }) => {
  const items = React.Children.toArray(children);
  const searchIndex = items.findIndex(containsSearchField);

  return (
    <div className={cn('flex flex-wrap items-center gap-2 w-full', className)}>
      {items.map((child, index) => {
        if (index !== searchIndex || !React.isValidElement<{ className?: string }>(child)) return child;
        return React.cloneElement(child, { className: cn(child.props.className, 'min-w-[240px] flex-1') });
      })}
      {actions ? <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
};
