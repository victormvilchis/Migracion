import React, { useEffect, useState } from 'react';
import { BBVAButton } from './BBVAButton';
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';
import { BBVADatePicker } from './BBVADatePicker';

interface Props {
  open: boolean;
  collaboratorName: string;
  certificationName: string;
  attemptNumber: number;
  initialDate?: string | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (date: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const CertificationQuickApprovalDialog: React.FC<Props> = ({ open, collaboratorName, certificationName, attemptNumber, initialDate, busy = false, onCancel, onConfirm }) => {
  const [date, setDate] = useState(initialDate || today());
  useEffect(() => { if (open) setDate(initialDate || today()); }, [initialDate, open]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[2600] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.3)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><h3 className="text-[16px] font-semibold text-slate-950">Aprobar certificación</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">{collaboratorName} · {certificationName} · Intento {attemptNumber}</p></div>
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5"><div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Fecha de presentación</div><BBVADatePicker value={date} onChange={setDate} disabled={busy} ariaLabel="Fecha de presentación" /></div>
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><BBVAButton type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</BBVAButton><BBVAButton type="button" variant="primary" onClick={() => date && onConfirm(date)} disabled={busy || !date}>{busy ? 'Guardando...' : 'Confirmar aprobación'}</BBVAButton></div>
      </div>
    </div>,
    document.body,
  );
};
