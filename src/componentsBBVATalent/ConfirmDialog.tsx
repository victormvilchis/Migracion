import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ConfirmDialogTone = 'danger' | 'warning' | 'success' | 'primary';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  tone?: ConfirmDialogTone;
  onConfirm: () => void;
  onCancel: () => void;
}

const tones: Record<ConfirmDialogTone, { surface: string; iconWrap: string; icon: string; button: string; Icon: typeof AlertTriangle }> = {
  danger: {
    surface: 'from-rose-50 to-white [.bbva-dark_&]:from-rose-500/10 [.bbva-dark_&]:to-slate-900',
    iconWrap: 'border-rose-200 bg-rose-50 [.bbva-dark_&]:border-rose-500/20 [.bbva-dark_&]:bg-rose-500/10',
    icon: 'text-rose-600 [.bbva-dark_&]:text-rose-300',
    button: 'bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-500',
    Icon: AlertTriangle,
  },
  warning: {
    surface: 'from-amber-50 to-white [.bbva-dark_&]:from-amber-500/10 [.bbva-dark_&]:to-slate-900',
    iconWrap: 'border-amber-200 bg-amber-50 [.bbva-dark_&]:border-amber-500/20 [.bbva-dark_&]:bg-amber-500/10',
    icon: 'text-amber-600 [.bbva-dark_&]:text-amber-300',
    button: 'bg-amber-600 hover:bg-amber-500 focus-visible:ring-amber-500',
    Icon: AlertTriangle,
  },
  success: {
    surface: 'from-emerald-50 to-white [.bbva-dark_&]:from-emerald-500/10 [.bbva-dark_&]:to-slate-900',
    iconWrap: 'border-emerald-200 bg-emerald-50 [.bbva-dark_&]:border-emerald-500/20 [.bbva-dark_&]:bg-emerald-500/10',
    icon: 'text-emerald-600 [.bbva-dark_&]:text-emerald-300',
    button: 'bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-500',
    Icon: CheckCircle2,
  },
  primary: {
    surface: 'from-blue-50 to-white [.bbva-dark_&]:from-blue-500/10 [.bbva-dark_&]:to-slate-900',
    iconWrap: 'border-blue-200 bg-blue-50 [.bbva-dark_&]:border-blue-500/20 [.bbva-dark_&]:bg-blue-500/10',
    icon: 'text-blue-600 [.bbva-dark_&]:text-blue-300',
    button: 'bg-blue-600 hover:bg-blue-500 focus-visible:ring-blue-500',
    Icon: Info,
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  busy = false,
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const style = tones[tone];
  const Icon = style.Icon;

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => cancelRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [busy, onCancel, open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1600] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[3px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-[720px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)] [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${style.surface}`} aria-hidden="true" />
        <div className="relative p-5 sm:p-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 [.bbva-dark_&]:hover:bg-slate-800 [.bbva-dark_&]:hover:text-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${style.iconWrap}`} aria-hidden="true">
              <Icon className={`h-7 w-7 ${style.icon}`} strokeWidth={2} />
            </div>

            <div className="min-w-0 flex-1 pr-8">
              <h3 id={titleId} className="text-[22px] font-semibold leading-7 text-slate-950 [.bbva-dark_&]:text-slate-100">
                {title}
              </h3>
              <p id={descriptionId} className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-500 [.bbva-dark_&]:text-slate-300">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-slate-200/80 pt-5 [.bbva-dark_&]:border-slate-700/80">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 [.bbva-dark_&]:border-slate-600 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`inline-flex h-11 min-w-[156px] items-center justify-center rounded-xl px-5 text-[13px] font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${style.button}`}
            >
              {busy ? 'Procesando...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
