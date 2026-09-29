import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/style.css';
import { SearchableSelect } from './SearchableSelect';
import './DatePicker.css';

export interface DatePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  minYear?: number;
  maxYear?: number;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const PANEL_GAP = 6;
const DEFAULT_PANEL_WIDTH = 390;
const VIEWPORT_MARGIN = 16;

function parseIsoDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return undefined;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return date;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function displayDate(value?: string | null): string {
  const date = parseIsoDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'dd/mm/aaaa',
  ariaLabel,
  minYear = new Date().getFullYear() - 70,
  maxYear = new Date().getFullYear() + 20,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => parseIsoDate(value), [value]);
  const selectedYear = selected?.getFullYear();
  const selectedMonth = selected?.getMonth();
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => selected ?? new Date());
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({ top: -9999, left: -9999, width: DEFAULT_PANEL_WIDTH });

  useEffect(() => {
    if (selectedYear === undefined || selectedMonth === undefined) return;
    setVisibleMonth(new Date(selectedYear, selectedMonth, 1));
  }, [selectedMonth, selectedYear]);

  const updatePosition = React.useCallback(() => {
    if (!open || !buttonRef.current || typeof window === 'undefined') return;
    const triggerRect = buttonRef.current.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 430;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(DEFAULT_PANEL_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2);
    const left = clamp(triggerRect.left, VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN);
    const availableBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN;
    const availableAbove = triggerRect.top - VIEWPORT_MARGIN;
    const renderAbove = availableBelow < panelHeight + PANEL_GAP && availableAbove > availableBelow;
    const top = renderAbove
      ? Math.max(VIEWPORT_MARGIN, triggerRect.top - panelHeight - PANEL_GAP)
      : Math.min(viewportHeight - panelHeight - VIEWPORT_MARGIN, triggerRect.bottom + PANEL_GAP);
    setPortalStyle({ position: 'fixed', top, left, width, zIndex: 2600 });
  }, [open]);

  useLayoutEffect(() => {
    updatePosition();
  }, [open, updatePosition, visibleMonth, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onViewportChange = () => updatePosition();
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, updatePosition]);

  const yearOptions = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, index) => {
      const year = maxYear - index;
      return { value: String(year), label: String(year) };
    }),
    [maxYear, minYear],
  );

  const moveMonth = (offset: number) => {
    const candidate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    const minDate = new Date(minYear, 0, 1);
    const maxDate = new Date(maxYear, 11, 1);
    if (candidate < minDate || candidate > maxDate) return;
    setVisibleMonth(candidate);
  };

  const panel = open && typeof document !== 'undefined'
    ? createPortal(
      <div ref={panelRef} style={portalStyle} className="system-date-picker rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.20)] [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900">
        <div className="mb-3 grid grid-cols-[34px_minmax(0,1fr)_minmax(0,0.72fr)_34px] items-center gap-2">
          <button type="button" onClick={() => moveMonth(-1)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:hover:bg-slate-800 [.bbva-dark_&]:hover:text-slate-100" aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></button>
          <SearchableSelect
            value={String(visibleMonth.getMonth())}
            onChange={(next) => setVisibleMonth(new Date(visibleMonth.getFullYear(), Number(next), 1))}
            options={MONTHS.map((label, index) => ({ value: String(index), label }))}
            ariaLabel="Mes"
            searchPlaceholder="Buscar mes"
            dropdownClassName="min-w-[170px]"
          />
          <SearchableSelect
            value={String(visibleMonth.getFullYear())}
            onChange={(next) => setVisibleMonth(new Date(Number(next), visibleMonth.getMonth(), 1))}
            options={yearOptions}
            ariaLabel="Año"
            searchPlaceholder="Buscar año"
            dropdownClassName="min-w-[130px]"
          />
          <button type="button" onClick={() => moveMonth(1)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:hover:bg-slate-800 [.bbva-dark_&]:hover:text-slate-100" aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <DayPicker
          mode="single"
          month={visibleMonth}
          selected={selected}
          onMonthChange={setVisibleMonth}
          onSelect={(date) => {
            if (!date) return;
            onChange(toIsoDate(date));
            setOpen(false);
          }}
          locale={es}
          weekStartsOn={1}
          showWeekNumber
          showOutsideDays
          fixedWeeks
          hideNavigation
          startMonth={new Date(minYear, 0, 1)}
          endMonth={new Date(maxYear, 11, 1)}
        />

        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 [.bbva-dark_&]:border-slate-700">
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              onChange(toIsoDate(today));
              setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              setOpen(false);
            }}
            className="h-8 rounded-xl px-3 text-[10.5px] font-semibold text-blue-700 transition hover:bg-blue-50 [.bbva-dark_&]:text-blue-300 [.bbva-dark_&]:hover:bg-blue-500/10"
          >
            Hoy
          </button>
          <div className="flex items-center gap-1.5">
            {value ? (
              <button type="button" onClick={() => onChange('')} className="inline-flex h-8 items-center gap-1 rounded-xl px-3 text-[10.5px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 [.bbva-dark_&]:hover:bg-slate-800 [.bbva-dark_&]:hover:text-slate-100"><X className="h-3.5 w-3.5" />Limpiar</button>
            ) : null}
            <button type="button" onClick={() => setOpen(false)} className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-[10.5px] font-semibold text-slate-600 transition hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-300 [.bbva-dark_&]:hover:bg-slate-800">Cerrar</button>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => {
          const next = !current;
          if (next && !selected) {
            const today = new Date();
            const year = clamp(today.getFullYear(), minYear, maxYear);
            setVisibleMonth(new Date(year, today.getMonth(), 1));
          }
          return next;
        })}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex h-9 w-full items-center gap-2 rounded-xl border bg-white px-3 text-left text-[11px] outline-none transition [.bbva-dark_&]:bg-slate-900 ${open ? 'border-blue-400 ring-2 ring-blue-500/15' : 'border-slate-300 hover:border-blue-300 [.bbva-dark_&]:border-slate-700'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span className={`min-w-0 flex-1 truncate ${value ? 'text-slate-900 [.bbva-dark_&]:text-slate-100' : 'text-slate-400 [.bbva-dark_&]:text-slate-500'}`}>
          {displayDate(value) || placeholder}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {panel}
    </div>
  );
};
