import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface BBVAAlertProps {
  tone?: 'success' | 'error' | 'info';
  children: React.ReactNode;
  onClose?: () => void;
}

const toneClass = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 [.bbva-dark_&]:border-emerald-500/25 [.bbva-dark_&]:bg-emerald-500/10 [.bbva-dark_&]:text-emerald-200',
  error: 'border-rose-200 bg-rose-50 text-rose-800 [.bbva-dark_&]:border-rose-500/25 [.bbva-dark_&]:bg-rose-500/10 [.bbva-dark_&]:text-rose-200',
  info: 'border-blue-200 bg-blue-50 text-blue-800 [.bbva-dark_&]:border-blue-500/25 [.bbva-dark_&]:bg-blue-500/10 [.bbva-dark_&]:text-blue-200',
} as const;

const iconByTone = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

export const BBVAAlert: React.FC<BBVAAlertProps> = ({ tone = 'info', children, onClose }) => {
  const Icon = iconByTone[tone];
  return (
    <div className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-xs ${toneClass[tone]}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="rounded p-0.5 opacity-70 transition hover:bg-black/5 hover:opacity-100 [.bbva-dark_&]:hover:bg-white/10" aria-label="Cerrar alerta">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
