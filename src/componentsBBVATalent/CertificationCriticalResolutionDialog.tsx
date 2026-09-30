import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, UserRoundCheck, X } from 'lucide-react';
import { BBVAButton } from './BBVAButton';

interface CertificationCriticalResolutionDialogProps {
  open: boolean;
  collaboratorName: string;
  certificationName: string;
  busy?: boolean;
  onCancel: () => void;
  onResolve: (resolution: 'LOW_REQUESTED' | 'INTERN', notes: string) => void;
}

export const CertificationCriticalResolutionDialog: React.FC<CertificationCriticalResolutionDialogProps> = ({
  open,
  collaboratorName,
  certificationName,
  busy = false,
  onCancel,
  onResolve,
}) => {
  const titleId = useId();
  const [notes, setNotes] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    setNotes('');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [busy, onCancel, open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[1700] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-[680px] rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,.35)] dark:border-slate-700 dark:bg-[#0b1728] dark:shadow-[0_32px_100px_rgba(0,0,0,.48)] [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[.08em] text-rose-600">Resolución crítica 2/2</div>
            <h3 id={titleId} className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100 [.bbva-dark_&]:text-slate-100">Resolver baja o becario</h3>
            <p className="mt-2 text-[12px] leading-5 text-slate-500 dark:text-slate-300 [.bbva-dark_&]:text-slate-300"><strong>{collaboratorName}</strong> agotó los dos intentos de <strong>{certificationName}</strong>. Esta decisión queda registrada; no ejecuta una baja destructiva automáticamente.</p>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Cerrar" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X className="h-4 w-4" /></button>
        </div>

        <label className="mt-4 block">
          <span className="text-[10px] font-semibold uppercase tracking-[.04em] text-slate-500">Observaciones</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} disabled={busy} placeholder="Contexto de la decisión (opcional)" className="mt-1 min-h-[92px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-blue-500 disabled:opacity-60 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-950 [.bbva-dark_&]:text-slate-100" />
        </label>

        <div className="mt-5 grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2 [.bbva-dark_&]:border-slate-700">
          <BBVAButton type="button" variant="danger" onClick={() => onResolve('LOW_REQUESTED', notes)} disabled={busy} icon={<Briefcase className="h-3.5 w-3.5" />}>{busy ? 'Procesando...' : 'Solicitar baja'}</BBVAButton>
          <BBVAButton type="button" variant="secondary" onClick={() => onResolve('INTERN', notes)} disabled={busy} icon={<UserRoundCheck className="h-3.5 w-3.5" />}>{busy ? 'Procesando...' : 'Marcar como becario'}</BBVAButton>
        </div>
      </div>
    </div>,
    document.body,
  );
};
