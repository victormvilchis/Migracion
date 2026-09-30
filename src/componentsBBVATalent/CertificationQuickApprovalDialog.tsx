import { bbvaBusinessDate } from '../lib/bbvaBusinessDate';
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
  tracksScore?: boolean;
  onCancel: () => void;
  onConfirm: (date: string, score10: number | null) => void;
}

const today = () => bbvaBusinessDate();

export const CertificationQuickApprovalDialog: React.FC<Props> = ({ open, collaboratorName, certificationName, attemptNumber, initialDate, busy = false, tracksScore = false, onCancel, onConfirm }) => {
  const [date, setDate] = useState(initialDate || today());
  const [score, setScore] = useState('');
  useEffect(() => { if (open) { setDate(initialDate || today()); setScore(''); } }, [initialDate, open]);
  const parsedScore = score.trim()==='' ? null : Number(score);
  const invalidScore = tracksScore && parsedScore !== null && (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 10);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[2600] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-[#0b1728] dark:shadow-[0_32px_100px_rgba(0,0,0,0.48)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><h3 className="text-[16px] font-semibold text-slate-950 dark:text-slate-100">Aprobar certificación</h3><p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-300">{collaboratorName} · {certificationName} · Intento {attemptNumber}</p></div>
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div><div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Fecha de presentación</div><BBVADatePicker value={date} onChange={setDate} disabled={busy} ariaLabel="Fecha de presentación" /></div>{tracksScore?<label><span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Calificación / score</span><input type="number" min={0} max={10} step="0.01" value={score} onChange={(event)=>setScore(event.target.value)} placeholder="0 - 10" className="h-9 w-full rounded-xl border border-slate-300 px-3 text-[11px] outline-none focus:border-blue-500" />{invalidScore?<span className="mt-1 block text-[9px] font-medium text-rose-600">Debe estar entre 0 y 10.</span>:null}</label>:null}</div>
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700"><BBVAButton type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</BBVAButton><BBVAButton type="button" variant="primary" onClick={() => date && onConfirm(date, tracksScore ? parsedScore : null)} disabled={busy || !date || invalidScore}>{busy ? 'Guardando...' : 'Confirmar aprobación'}</BBVAButton></div>
      </div>
    </div>,
    document.body,
  );
};
