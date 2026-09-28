import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';

export type BBVAOperationFeedbackStatus = 'start' | 'success' | 'error';
export interface BBVAOperationFeedbackDetail {
  id: string;
  status: BBVAOperationFeedbackStatus;
  message: string;
}

export const BBVA_OPERATION_FEEDBACK_EVENT = 'bbva:operation-feedback';

export const BBVAOperationFeedback: React.FC = () => {
  const [detail, setDetail] = useState<BBVAOperationFeedbackDetail | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<BBVAOperationFeedbackDetail>;
      if (!custom.detail?.id) return;
      setDetail(custom.detail);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (custom.detail.status !== 'start') {
        timerRef.current = window.setTimeout(() => setDetail((current) => current?.id === custom.detail.id ? null : current), custom.detail.status === 'error' ? 6000 : 2200);
      }
    };
    window.addEventListener(BBVA_OPERATION_FEEDBACK_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(BBVA_OPERATION_FEEDBACK_EVENT, handler as EventListener);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!detail) return null;
  const isStart = detail.status === 'start';
  const isError = detail.status === 'error';
  const Icon = isStart ? Loader2 : isError ? AlertCircle : CheckCircle2;
  const tone = isStart
    ? 'border-blue-200 bg-blue-50 text-blue-800 [.bbva-dark_&]:border-blue-400/20 [.bbva-dark_&]:bg-blue-400/10 [.bbva-dark_&]:text-blue-200'
    : isError
      ? 'border-rose-200 bg-rose-50 text-rose-800 [.bbva-dark_&]:border-rose-400/20 [.bbva-dark_&]:bg-rose-400/10 [.bbva-dark_&]:text-rose-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800 [.bbva-dark_&]:border-emerald-400/20 [.bbva-dark_&]:bg-emerald-400/10 [.bbva-dark_&]:text-emerald-200';

  return (
    <div className="fixed right-3 top-[66px] z-[3900] w-[min(420px,calc(100vw-1.5rem))]" role={isError ? 'alert' : 'status'} aria-live={isError ? 'assertive' : 'polite'}>
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 shadow-[0_12px_36px_-16px_rgba(15,23,42,.35)] backdrop-blur ${tone}`}>
        <Icon className={`h-4 w-4 shrink-0 ${isStart ? 'animate-spin' : ''}`} />
        <span className="min-w-0 flex-1 text-[11px] font-semibold leading-4">{detail.message}</span>
        {!isStart ? <button type="button" aria-label="Cerrar notificación" onClick={() => setDetail(null)} className="flex h-6 w-6 items-center justify-center rounded-md opacity-60 hover:bg-white/60 hover:opacity-100"><X className="h-3.5 w-3.5" /></button> : null}
      </div>
    </div>
  );
};
