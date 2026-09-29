const SEPARATOR = '~';

export function decodeMultiValue(value?: string | null): string[] {
  return String(value ?? '')
    .split(SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index);
}

export function encodeMultiValue(values: string[]): string {
  return values.map((item) => item.trim()).filter(Boolean).filter((item, index, all) => all.indexOf(item) === index).join(SEPARATOR);
}

export function toggleMultiValue(value: string | null | undefined, item: string): string {
  const current = decodeMultiValue(value);
  const next = current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item];
  return encodeMultiValue(next);
}
