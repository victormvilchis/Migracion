export const BBVA_BUSINESS_TIME_ZONE = 'America/Mexico_City';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BBVA_BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha civil operativa de BBVA México, formato YYYY-MM-DD. */
export function bbvaBusinessDate(reference = new Date()): string {
  const parts = formatter.formatToParts(reference);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
