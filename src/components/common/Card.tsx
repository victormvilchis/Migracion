import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'glass-panel rounded-xl p-5 shadow-lg shadow-black/40',
        hoverEffect && 'glass-panel-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
