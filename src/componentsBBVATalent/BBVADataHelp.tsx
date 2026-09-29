import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export interface BBVADataHelpContent {
  what: string;
  calculation?: string;
  interpretation?: string;
  scope?: string;
}

interface BBVADataHelpProps {
  label: string;
  content: BBVADataHelpContent;
}

const VIEWPORT_MARGIN = 16;
const PANEL_GAP = 8;
const EVENT_NAME = 'bbva:data-help:open';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const BBVADataHelp: React.FC<BBVADataHelpProps> = ({ label, content }) => {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({ top: -9999, left: -9999, width: 310, position: 'fixed', zIndex: 2400 });

  const updatePosition = React.useCallback(() => {
    if (!open || !buttonRef.current || typeof window === 'undefined') return;
    const triggerRect = buttonRef.current.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 220;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(310, viewportWidth - VIEWPORT_MARGIN * 2);
    const left = clamp(triggerRect.right - width, VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN);
    const availableBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN;
    const availableAbove = triggerRect.top - VIEWPORT_MARGIN;
    const renderAbove = availableBelow < panelHeight + PANEL_GAP && availableAbove > availableBelow;
    const top = renderAbove
      ? Math.max(VIEWPORT_MARGIN, triggerRect.top - panelHeight - PANEL_GAP)
      : Math.min(viewportHeight - panelHeight - VIEWPORT_MARGIN, triggerRect.bottom + PANEL_GAP);
    setStyle({ position: 'fixed', top, left, width, zIndex: 2400 });
  }, [open]);

  useLayoutEffect(() => {
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onViewportChange = () => updatePosition();
    const onExternalOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== id) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener(EVENT_NAME, onExternalOpen as EventListener);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener(EVENT_NAME, onExternalOpen as EventListener);
    };
  }, [id, open, updatePosition]);

  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      if (next && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { id } }));
      }
      return next;
    });
  };

  const panel = open && typeof document !== 'undefined'
    ? createPortal(
      <div ref={panelRef} style={style} className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-[0_18px_50px_rgba(15,23,42,0.20)] [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900">
        <div className="text-[10px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">{label}</div>
        <dl className="mt-2 space-y-2 text-[9.5px] leading-4">
          <div>
            <dt className="font-semibold uppercase tracking-[0.04em] text-slate-400">Qué mide</dt>
            <dd className="mt-0.5 text-slate-600 [.bbva-dark_&]:text-slate-300">{content.what}</dd>
          </div>
          {content.calculation ? (
            <div>
              <dt className="font-semibold uppercase tracking-[0.04em] text-slate-400">Cómo se calcula</dt>
              <dd className="mt-0.5 text-slate-600 [.bbva-dark_&]:text-slate-300">{content.calculation}</dd>
            </div>
          ) : null}
          {content.interpretation ? (
            <div>
              <dt className="font-semibold uppercase tracking-[0.04em] text-slate-400">Cómo interpretarlo</dt>
              <dd className="mt-0.5 text-slate-600 [.bbva-dark_&]:text-slate-300">{content.interpretation}</dd>
            </div>
          ) : null}
          {content.scope ? (
            <div>
              <dt className="font-semibold uppercase tracking-[0.04em] text-slate-400">Qué afecta el valor</dt>
              <dd className="mt-0.5 text-slate-600 [.bbva-dark_&]:text-slate-300">{content.scope}</dd>
            </div>
          ) : null}
        </dl>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 [.bbva-dark_&]:text-slate-500 [.bbva-dark_&]:hover:bg-slate-800 [.bbva-dark_&]:hover:text-slate-200"
        aria-label={`Más información sobre ${label}`}
        title={`Más información sobre ${label}`}
        aria-expanded={open}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {panel}
    </>
  );
};
