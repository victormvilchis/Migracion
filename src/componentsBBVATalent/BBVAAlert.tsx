import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type BBVAAlertTone = 'success' | 'error' | 'info' | 'warning';

interface BBVAAlertProps {
  tone?: BBVAAlertTone;
  children: React.ReactNode;
  onClose?: () => void;
  durationMs?: number;
  persistent?: boolean;
  title?: string;
}

const DEFAULT_DURATION: Record<BBVAAlertTone, number> = {
  success: 4500,
  info: 5500,
  warning: 7000,
  error: 9000,
};

const toneConfig: Record<
  BBVAAlertTone,
  {
    accent: string;
    iconContainer: string;
    progress: string;
    icon: React.ReactNode;
  }
> = {
  success: {
    accent: 'bg-emerald-500',
    iconContainer: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    progress: 'bg-emerald-500',
    icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  error: {
    accent: 'bg-rose-500',
    iconContainer: 'border-rose-200 bg-rose-50 text-rose-600',
    progress: 'bg-rose-500',
    icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  info: {
    accent: 'bg-blue-500',
    iconContainer: 'border-blue-200 bg-blue-50 text-blue-600',
    progress: 'bg-blue-500',
    icon: <Info className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  warning: {
    accent: 'bg-amber-500',
    iconContainer: 'border-amber-200 bg-amber-50 text-amber-600',
    progress: 'bg-amber-500',
    icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
  },
};

export const BBVAAlert: React.FC<BBVAAlertProps> = ({
  tone = 'info',
  children,
  onClose,
  durationMs,
  persistent = false,
  title,
}) => {
  const effectiveDuration = durationMs ?? DEFAULT_DURATION[tone];
  const [visible, setVisible] = useState(true);
  const [remainingMs, setRemainingMs] = useState(effectiveDuration);
  const [paused, setPaused] = useState(false);
  const lastTickRef = useRef(Date.now());
  const config = toneConfig[tone];

  const close = useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    setVisible(true);
    setRemainingMs(effectiveDuration);
    setPaused(false);
    lastTickRef.current = Date.now();
  }, [children, effectiveDuration, title, tone]);

  useEffect(() => {
    if (!visible || persistent || paused) return undefined;

    lastTickRef.current = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      setRemainingMs((current) => {
        const next = Math.max(0, current - elapsed);
        if (next === 0) {
          window.clearInterval(timer);
          window.setTimeout(close, 0);
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [close, paused, persistent, visible]);

  const progress = useMemo(() => {
    if (persistent || effectiveDuration <= 0) return 100;
    return Math.max(0, Math.min(100, (remainingMs / effectiveDuration) * 100));
  }, [effectiveDuration, persistent, remainingMs]);

  if (!visible) return null;

  const toast = (
    <div
      className="fixed right-3 top-[66px] z-[4000] w-[min(520px,calc(100vw-1.5rem))] sm:right-4"
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white/98 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900/98 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.28)] backdrop-blur-lg">
        <span className={`absolute inset-y-0 left-0 w-0.5 ${config.accent}`} aria-hidden="true" />

        <div className="flex items-start gap-2.5 px-3 py-2.5 pl-3.5">
          <span
            className={`mt-px flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg border ${config.iconContainer}`}
            aria-hidden="true"
          >
            {config.icon}
          </span>

          <div className="min-w-0 flex-1">
            {title && (
              <div className="mb-0.5 break-words text-[11.5px] font-semibold leading-4 tracking-[-0.01em] text-slate-900 [.bbva-dark_&]:text-slate-100">
                {title}
              </div>
            )}
            <div className="whitespace-pre-wrap break-words text-[11.5px] leading-[1.45] text-slate-600 [.bbva-dark_&]:text-slate-300">{children}</div>
          </div>

          <button
            type="button"
            onClick={close}
            className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            aria-label="Cerrar notificación"
            title="Cerrar"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        {!persistent && (
          <div className="absolute inset-x-0 bottom-0 h-px bg-slate-100" aria-hidden="true">
            <div
              className={`h-full transition-[width] duration-100 ease-linear ${config.progress}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );

  // Renderizar en document.body evita que transforms/animaciones de la vista
  // desplacen temporalmente una notificación con position: fixed.
  return typeof document === 'undefined' ? toast : createPortal(toast, document.body);
};
