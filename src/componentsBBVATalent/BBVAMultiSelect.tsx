import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../lib/utils';
import type { BBVASearchableSelectOption } from './BBVASearchableSelect';

interface Props {
  values: string[];
  options: BBVASearchableSelectOption[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  selectedLabel?: string;
  ariaLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export const BBVAMultiSelect: React.FC<Props> = ({
  values,
  options,
  onChange,
  placeholder = 'Seleccionar',
  selectedLabel = 'seleccionadas',
  ariaLabel,
  searchPlaceholder = 'Buscar opción',
  emptyMessage = 'No se encontraron coincidencias.',
  className,
  disabled = false,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ left: 0, top: 0, width: 300, maxHeight: 320, opensUp: false });
  const selected = useMemo(() => new Set(values), [values]);
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLocaleUpperCase('es-MX');
    if (!normalized) return options;
    return options.filter((option) => `${option.label} ${option.description ?? ''}`.toLocaleUpperCase('es-MX').includes(normalized));
  }, [options, query]);
  const summary = useMemo(() => {
    if (!values.length) return placeholder;
    if (values.length === 1) return options.find((option) => option.value === values[0])?.label ?? values[0];
    return `${values.length} ${selectedLabel}`;
  }, [options, placeholder, selectedLabel, values]);

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pad = 8;
    const below = window.innerHeight - rect.bottom - pad;
    const above = rect.top - pad;
    const opensUp = below < 240 && above > below;
    const maxHeight = Math.max(180, Math.min(360, (opensUp ? above : below) - 6));
    const width = Math.max(rect.width, 290);
    const left = Math.min(Math.max(pad, rect.left), Math.max(pad, window.innerWidth - width - pad));
    const top = opensUp ? Math.max(pad, rect.top - maxHeight - 6) : rect.bottom + 6;
    setPosition({ left, top, width, maxHeight, opensUp });
  };

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    updatePosition();
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    const update = () => updatePosition();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.clearTimeout(timer); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [open]);

  useEffect(() => {
    const pointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', pointer);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', pointer); document.removeEventListener('keydown', key); };
  }, []);

  const toggle = (value: string) => onChange(selected.has(value) ? values.filter((item) => item !== value) : [...values, value]);

  return <div className={cn('relative min-w-0', className)}>
    <button ref={buttonRef} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={cn('group relative flex h-9 w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-left text-[11px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition hover:border-blue-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500/25', open && 'border-blue-400 ring-2 ring-blue-500/15', disabled && 'cursor-not-allowed opacity-60')}>
      <span className={cn('min-w-0 flex-1 truncate', !values.length && 'text-slate-500')}>{summary}</span>
      {values.length ? <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">{values.length}</span> : null}
      <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition', open && 'rotate-180 text-blue-500')} />
    </button>
    {open && createPortal(<div ref={panelRef} className="fixed z-[2200] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]" style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }} data-opens-up={position.opensUp ? 'true' : 'false'}>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/90 p-2">
        <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="h-8 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[11px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15" />
        {values.length ? <button type="button" onClick={() => onChange([])} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[9.5px] font-semibold text-blue-700 hover:bg-blue-50"><X className="h-3 w-3" />Limpiar</button> : null}
      </div>
      <div className="overflow-y-auto py-1 [scrollbar-width:thin]" style={{ maxHeight: Math.max(120, position.maxHeight - 52) }} role="listbox" aria-multiselectable="true">
        {filteredOptions.length ? filteredOptions.map((option) => {
          const isSelected = selected.has(option.value);
          return <button key={option.value} type="button" role="option" aria-selected={isSelected} disabled={option.disabled} onClick={() => toggle(option.value)} className={cn('flex w-full items-start gap-2 px-3 py-2 text-left transition', isSelected ? 'bg-blue-50 text-blue-950' : 'text-slate-700 hover:bg-slate-50', option.disabled && 'cursor-not-allowed opacity-50')}>
            <span className={cn('mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center rounded-md border', isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white')}>{isSelected ? <Check className="h-3 w-3" /> : null}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium">{option.label}</span>{option.description ? <span className="mt-0.5 block text-[9.5px] text-slate-500">{option.description}</span> : null}</span>
          </button>;
        }) : <div className="px-3 py-6 text-center text-[11px] text-slate-500">{emptyMessage}</div>}
      </div>
    </div>, document.body)}
  </div>;
};
