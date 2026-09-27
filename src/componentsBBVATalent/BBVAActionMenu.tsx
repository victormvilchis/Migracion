import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const [position, setPosition] = useState({ top: 0, right: 0, maxHeight: 320 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const button = buttonRef.current?.getBoundingClientRect();
    if (!button) return;
    const menuHeight = menuRef.current?.getBoundingClientRect().height || Math.min(320, Math.max(48, items.length * 38 + 8));
    const padding = 8;
    const below = window.innerHeight - button.bottom - padding;
    const above = button.top - padding;
    const openUp = below < menuHeight && above > below;
    const maxHeight = Math.max(120, Math.min(320, openUp ? above - 6 : below - 6));
    setPosition({
      top: openUp ? Math.max(padding, button.top - Math.min(menuHeight, maxHeight) - 4) : button.bottom + 4,
      right: Math.max(padding, window.innerWidth - button.right),
      maxHeight,
    });
  };

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const update = () => updatePosition();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, items.length]);

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
        <div
          ref={menuRef}
          className="fixed z-[2300] min-w-[190px] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-[0_18px_48px_rgba(15,23,42,0.2)] [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900"
          style={{ top: position.top, right: position.right, maxHeight: position.maxHeight }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => { setOpen(false); item.onClick(); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition disabled:cursor-not-allowed disabled:opacity-40 ${item.tone === 'danger' ? 'text-rose-600 hover:bg-rose-50 [.bbva-dark_&]:text-rose-300 [.bbva-dark_&]:hover:bg-rose-500/10' : 'text-slate-700 hover:bg-slate-50 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-white/[0.06]'}`}
              >
                {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
};
