import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  dropdownClassName?: string;
}

const buttonClass =
  'group relative flex h-9 w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-left text-[11px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition hover:border-blue-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500/25 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100 [.bbva-dark_&]:hover:border-blue-500/50 [.bbva-dark_&]:hover:bg-slate-800';

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Seleccionar',
  disabled = false,
  ariaLabel,
  searchPlaceholder = 'Buscar opción',
  emptyMessage = 'No se encontraron coincidencias.',
  className,
  dropdownClassName,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLocaleUpperCase('es-MX');
    if (!normalized) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ''}`.toLocaleUpperCase('es-MX');
      return haystack.includes(normalized);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          buttonClass,
          open && 'border-blue-400 ring-2 ring-blue-500/15',
          disabled && 'cursor-not-allowed opacity-60 hover:border-slate-300 hover:bg-white [.bbva-dark_&]:hover:bg-slate-900',
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selectedOption && 'text-slate-400 [.bbva-dark_&]:text-slate-500')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition', open && 'rotate-180 text-blue-500')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[1200] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)] [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900',
            dropdownClassName,
          )}
        >
          <div className="border-b border-slate-200 bg-slate-50/85 p-2 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-950/70">
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-8 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100"
            />
          </div>

          <div className="max-h-64 overflow-y-auto py-1 [scrollbar-width:thin]">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-start gap-2 px-3 py-2 text-left transition',
                      selected
                        ? 'bg-blue-50 text-blue-950 [.bbva-dark_&]:bg-blue-500/10 [.bbva-dark_&]:text-blue-100'
                        : 'text-slate-700 hover:bg-slate-50 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800/80',
                      option.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span className={cn(
                      'mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center rounded-md border',
                      selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900',
                    )}>
                      {selected ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium">{option.label}</span>
                      {option.description ? (
                        <span className="mt-0.5 block text-[10px] text-slate-500 [.bbva-dark_&]:text-slate-400">{option.description}</span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-[11px] text-slate-500 [.bbva-dark_&]:text-slate-400">{emptyMessage}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
