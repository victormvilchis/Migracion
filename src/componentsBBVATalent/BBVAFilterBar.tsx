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
 * - distribuye filtros para no dejar huecos visuales en el header;
 * - si existe un buscador, éste absorbe más espacio que el resto;
 * - acciones permanecen integradas al extremo derecho.
 */
export const BBVAFilterBar: React.FC<BBVAFilterBarProps> = ({ children, actions, className }) => {
  const items = React.Children.toArray(children);
  const searchIndex = items.findIndex(containsSearchField);

  const stretch = (child: React.ReactNode, index: number) => {
    const search = index === searchIndex;
    const stretchClass = search
      ? 'min-w-[240px] flex-1 basis-[320px] !w-full'
      : 'min-w-[170px] flex-1 basis-[180px] !w-full';

    if (!React.isValidElement<{ className?: string }>(child)) {
      return <div className={stretchClass}>{child}</div>;
    }
    return React.cloneElement(child, { className: cn(child.props.className, stretchClass) });
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2 w-full', className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {items.map((child, index) => (
          <React.Fragment key={index}>{stretch(child, index)}</React.Fragment>
        ))}
      </div>
      {actions ? <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
};
