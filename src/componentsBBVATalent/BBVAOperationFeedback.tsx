import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';

export type BBVAOperationFeedbackStatus = 'start' | 'success' | 'error';
export interface BBVAOperationFeedbackDetail {
  id: string;
  status: BBVAOperationFeedbackStatus;
  message: string;
}

interface VisibleFeedback extends BBVAOperationFeedbackDetail {
  updatedAt: number;
}

export const BBVA_OPERATION_FEEDBACK_EVENT = 'bbva:operation-feedback';

/**
 * Feedback transversal de mutaciones BBVA.
 *
 * Mantiene cada operación por id para que dos requests concurrentes no se
 * pisen entre sí. Un éxito/error de una operación nunca oculta el estado
 * "procesando" de otra que todavía sigue activa.
 */
export const BBVAOperationFeedback: React.FC = () => {
  const [items, setItems] = useState<VisibleFeedback[]>([]);
  const timersRef = useRef(new Map<string, number>());

  useEffect(() => {
    const remove = (id: string) => {
      setItems((current) => current.filter((item) => item.id !== id));
      const timer = timersRef.current.get(id);
      if (timer) window.clearTimeout(timer);
      timersRef.current.delete(id);
    };

    const handler = (event: Event) => {
      const custom = event as CustomEvent<BBVAOperationFeedbackDetail>;
      if (!custom.detail?.id) return;
      const next: VisibleFeedback = { ...custom.detail, updatedAt: Date.now() };
      setItems((current) => {
        const withoutCurrent = current.filter((item) => item.id !== next.id);
        return [...withoutCurrent, next].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
      });

      const previousTimer = timersRef.current.get(next.id);
      if (previousTimer) window.clearTimeout(previousTimer);
      timersRef.current.delete(next.id);
      if (next.status !== 'start') {
        const timer = window.setTimeout(() => remove(next.id), next.status === 'error' ? 6000 : 2400);
        timersRef.current.set(next.id, timer);
      }
    };

    window.addEventListener(BBVA_OPERATION_FEEDBACK_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(BBVA_OPERATION_FEEDBACK_EVENT, handler as EventListener);
      for (const timer of timersRef.current.values()) window.clearTimeout(timer);
      timersRef.current.clear();
    };
  }, []);

  const ordered = useMemo(() => [...items].sort((a, b) => {
    const weight = (status: BBVAOperationFeedbackStatus) => status === 'start' ? 0 : status === 'error' ? 1 : 2;
    return weight(a.status) - weight(b.status) || b.updatedAt - a.updatedAt;
  }), [items]);

  if (!ordered.length) return null;

  return (
    <div className="fixed right-3 top-[66px] z-[3900] flex w-[min(420px,calc(100vw-1.5rem))] flex-col gap-2" aria-label="Estado de operaciones">
      {ordered.map((detail) => {
        const isStart = detail.status === 'start';
        const isError = detail.status === 'error';
        const Icon = isStart ? Loader2 : isError ? AlertCircle : CheckCircle2;
        const tone = isStart
          ? 'border-blue-200 bg-blue-50 text-blue-800 [.bbva-dark_&]:border-blue-400/20 [.bbva-dark_&]:bg-blue-400/10 [.bbva-dark_&]:text-blue-200'
          : isError
            ? 'border-rose-200 bg-rose-50 text-rose-800 [.bbva-dark_&]:border-rose-400/20 [.bbva-dark_&]:bg-rose-400/10 [.bbva-dark_&]:text-rose-200'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800 [.bbva-dark_&]:border-emerald-400/20 [.bbva-dark_&]:bg-emerald-400/10 [.bbva-dark_&]:text-emerald-200';
        return (
          <div key={detail.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 shadow-[0_12px_36px_-16px_rgba(15,23,42,.35)] backdrop-blur ${tone}`} role={isError ? 'alert' : 'status'} aria-live={isError ? 'assertive' : 'polite'}>
            <Icon className={`h-4 w-4 shrink-0 ${isStart ? 'animate-spin' : ''}`} />
            <span className="min-w-0 flex-1 text-[11px] font-semibold leading-4">{detail.message}</span>
            {!isStart ? <button type="button" aria-label="Cerrar notificación" onClick={() => { const timer = timersRef.current.get(detail.id); if (timer) window.clearTimeout(timer); timersRef.current.delete(detail.id); setItems((current) => current.filter((item) => item.id !== detail.id)); }} className="flex h-6 w-6 items-center justify-center rounded-md opacity-60 hover:bg-white/60 hover:opacity-100"><X className="h-3.5 w-3.5" /></button> : null}
          </div>
        );
      })}
    </div>
  );
};
