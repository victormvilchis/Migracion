import React from 'react';
import { ArrowLeft, Save, Trash2, X } from 'lucide-react';

export type BBVAFormMode = 'create' | 'view' | 'edit' | 'delete';

export const isBBVAFormReadOnly = (mode: BBVAFormMode): boolean => mode === 'view' || mode === 'delete';

interface BBVAFormBackButtonProps {
  onBack: () => void;
  disabled?: boolean;
  label?: string;
}

export const BBVAFormBackButton: React.FC<BBVAFormBackButtonProps> = ({ onBack, disabled = false, label = 'Regresar' }) => (
  <button
    type="button"
    onClick={onBack}
    disabled={disabled}
    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"
  >
    <ArrowLeft className="h-3.5 w-3.5" /> {label}
  </button>
);

interface BBVAFormActionsProps {
  mode: BBVAFormMode;
  busy?: boolean;
  submitDisabled?: boolean;
  onBack: () => void;
  onDelete?: () => void;
  createLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
}

export const BBVAFormActions: React.FC<BBVAFormActionsProps> = ({
  mode,
  busy = false,
  submitDisabled = false,
  onBack,
  onDelete,
  createLabel = 'Guardar',
  editLabel = 'Guardar cambios',
  deleteLabel = 'Eliminar',
}) => {
  const baseSecondary = 'inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800';

  // En modo vista no existe barra inferior: la única acción es Regresar y vive
  // siempre arriba a la izquierda de la página mediante BBVAFormBackButton.
  if (mode === 'view') return null;

  // En modo eliminar, Regresar también vive arriba a la izquierda. Aquí se
  // mantiene únicamente la acción destructiva, claramente separada del resto.
  if (mode === 'delete') {
    return (
      <div className="flex justify-end border-t border-slate-200 pt-3 [.bbva-dark_&]:border-slate-800">
        <button
          type="button"
          onClick={onDelete}
          disabled={busy || !onDelete}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-600 px-4 text-[11px] font-semibold text-white shadow-sm transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> {busy ? 'Eliminando...' : deleteLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3 [.bbva-dark_&]:border-slate-800">
      <button type="button" onClick={onBack} disabled={busy} className={baseSecondary}>
        <X className="h-3.5 w-3.5" /> Cancelar
      </button>
      <button
        type="submit"
        disabled={busy || submitDisabled}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5" /> {busy ? 'Guardando...' : mode === 'create' ? createLabel : editLabel}
      </button>
    </div>
  );
};
