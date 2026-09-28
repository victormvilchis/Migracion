/**
 * Reloj operativo de BBVA México.
 *
 * Las reglas de negocio basadas en "hoy" (Q/Vendors, vencimientos,
 * programación y snapshots) deben evaluarse con la fecha civil de México,
 * no con el día UTC del proceso de Azure Functions.
 */
export const BBVA_BUSINESS_TIME_ZONE = 'America/Mexico_City';

const businessDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BBVA_BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function bbvaBusinessDate(reference = new Date()): string {
  const parts = businessDateFormatter.formatToParts(reference);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addBusinessDays(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

/**
 * SQL Server local: México centro opera en UTC-6 sin horario estacional desde
 * 2023. Se utiliza exclusivamente para reglas de fecha civil, no timestamps.
 */
export const BBVA_SQL_BUSINESS_DATE = `CONVERT(date,DATEADD(hour,-6,SYSUTCDATETIME()))`;
