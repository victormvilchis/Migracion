import { bbvaBusinessDate } from './bbvaBusinessTime.js';

export interface VendorQuarterDefinition {
  code: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  startDate: string;
  endDate: string;
}

export interface VendorQuarterContext {
  calendarName: string;
  sourceYear: number;
  referenceDate: string;
  currentQuarter: VendorQuarterDefinition | null;
  nextQuarter: VendorQuarterDefinition | null;
  selectedQuarter: VendorQuarterDefinition | null;
  /** Alias de compatibilidad. Desde V23 representa el Q seleccionado. */
  targetQuarter: VendorQuarterDefinition | null;
  daysToTargetStart: number | null;
  daysToTargetEnd: number | null;
  daysToSelectedStart: number | null;
  daysToSelectedEnd: number | null;
  progressPercent: number | null;
  years: number[];
  quarters: VendorQuarterDefinition[];
}

/**
 * Calendario operativo proporcionado por el negocio.
 * No se generan Q de años que no hayan sido configurados explícitamente.
 */
export const BBVA_VENDOR_QUARTERS: VendorQuarterDefinition[] = [
  { code: '2026Q1', year: 2026, quarter: 1, startDate: '2025-12-29', endDate: '2026-03-29' },
  { code: '2026Q2', year: 2026, quarter: 2, startDate: '2026-03-30', endDate: '2026-06-28' },
  { code: '2026Q3', year: 2026, quarter: 3, startDate: '2026-06-29', endDate: '2026-09-27' },
  { code: '2026Q4', year: 2026, quarter: 4, startDate: '2026-09-28', endDate: '2026-12-27' },
];

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.ceil((to - from) / 86400000);
}

export function vendorQuarterByCode(code: string | null | undefined): VendorQuarterDefinition | null {
  const normalized = String(code ?? '').trim().toUpperCase();
  if (!normalized) return null;
  return BBVA_VENDOR_QUARTERS.find((item) => item.code === normalized) ?? null;
}

export function vendorQuarterContext(reference = new Date(), requestedCode?: string | null): VendorQuarterContext {
  const today = bbvaBusinessDate(reference);
  const currentQuarter = BBVA_VENDOR_QUARTERS.find((item) => today >= item.startDate && today <= item.endDate) ?? null;
  const nextQuarter = BBVA_VENDOR_QUARTERS.find((item) => item.startDate > today) ?? null;
  const requestedQuarter = vendorQuarterByCode(requestedCode);
  const selectedQuarter = requestedQuarter ?? currentQuarter ?? nextQuarter ?? BBVA_VENDOR_QUARTERS.at(-1) ?? null;
  // Compatibilidad: targetQuarter conserva la semántica histórica de preparación al siguiente Q.
  // La selección visual/analítica vive separada en selectedQuarter.
  const targetQuarter = requestedQuarter ?? nextQuarter ?? currentQuarter ?? selectedQuarter;
  const sourceYear = selectedQuarter?.year ?? currentQuarter?.year ?? BBVA_VENDOR_QUARTERS.at(-1)?.year ?? new Date().getUTCFullYear();
  const duration = selectedQuarter ? Math.max(1, daysBetween(selectedQuarter.startDate, selectedQuarter.endDate) + 1) : null;
  const elapsed = selectedQuarter
    ? Math.max(0, Math.min(duration ?? 1, daysBetween(selectedQuarter.startDate, today) + 1))
    : null;
  return {
    calendarName: 'Calendario BBVA',
    sourceYear,
    referenceDate: today,
    currentQuarter,
    nextQuarter,
    selectedQuarter,
    targetQuarter,
    daysToTargetStart: targetQuarter ? Math.max(0, daysBetween(today, targetQuarter.startDate)) : null,
    daysToTargetEnd: targetQuarter ? Math.max(0, daysBetween(today, targetQuarter.endDate)) : null,
    daysToSelectedStart: selectedQuarter ? Math.max(0, daysBetween(today, selectedQuarter.startDate)) : null,
    daysToSelectedEnd: selectedQuarter ? Math.max(0, daysBetween(today, selectedQuarter.endDate)) : null,
    progressPercent: duration && elapsed !== null ? Math.round((elapsed / duration) * 10000) / 100 : null,
    years: [...new Set(BBVA_VENDOR_QUARTERS.map((item) => item.year))].sort((a, b) => a - b),
    quarters: [...BBVA_VENDOR_QUARTERS],
  };
}
