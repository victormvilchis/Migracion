import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export interface BBVAActionItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}

export const BBVAActionMenu: React.FC<{ items: BBVAActionItem[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!buttonRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-[10.5px] font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"
        aria-expanded={open}
      >
        Acciones <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div ref={menuRef} className="fixed z-[1500] min-w-[184px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900" style={{ top: position.top, right: position.right }}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" disabled={item.disabled} onClick={() => { setOpen(false); item.onClick(); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition disabled:cursor-not-allowed disabled:opacity-40 ${item.tone === 'danger' ? 'text-rose-600 hover:bg-rose-50 [.bbva-dark_&]:text-rose-300 [.bbva-dark_&]:hover:bg-rose-500/10' : 'text-slate-700 hover:bg-slate-50 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-white/[0.06]'}`}>
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}<span>{item.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};
