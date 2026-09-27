import React from 'react';

export type BBVAButtonVariant = 'primary' | 'secondary' | 'danger' | 'table' | 'tableDanger';
export type BBVAButtonSize = 'sm' | 'md';

const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl border font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50';
const variants: Record<BBVAButtonVariant, string> = {
  primary: 'border-blue-600 bg-blue-600 text-white hover:border-blue-500 hover:bg-blue-500',
  secondary: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800',
  danger: 'border-rose-600 bg-rose-600 text-white hover:border-rose-500 hover:bg-rose-500',
  table: 'border-slate-300 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-blue-300 [.bbva-dark_&]:hover:bg-blue-500/10',
  tableDanger: 'border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50 [.bbva-dark_&]:border-rose-500/30 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-rose-300 [.bbva-dark_&]:hover:bg-rose-500/10',
};
const sizes: Record<BBVAButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[9.5px]',
  md: 'h-9 px-4 text-[11px]',
};

export interface BBVAButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BBVAButtonVariant;
  size?: BBVAButtonSize;
  icon?: React.ReactNode;
}

export const BBVAButton: React.FC<BBVAButtonProps> = ({ variant = 'secondary', size = 'md', icon, className = '', children, ...props }) => (
  <button {...props} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()}>
    {icon}
    {children}
  </button>
);
