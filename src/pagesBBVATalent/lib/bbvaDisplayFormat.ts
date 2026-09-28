export function sentenceCaseData(value: string | null | undefined, fallback = 'No disponible'): string {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return fallback;
  if (/^[^\p{L}]*$/u.test(text)) return text;
  const lower = text.toLocaleLowerCase('es-MX');
  const firstLetter = lower.search(/\p{L}/u);
  if (firstLetter < 0) return lower;
  return `${lower.slice(0, firstLetter)}${lower.charAt(firstLetter).toLocaleUpperCase('es-MX')}${lower.slice(firstLetter + 1)}`;
}

export function upperIdentity(value: string | null | undefined, fallback = 'No disponible'): string {
  const text = String(value ?? '').trim();
  return text ? text.toLocaleUpperCase('es-MX') : fallback;
}

export function displayEmail(value: string | null | undefined, fallback = 'No disponible'): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function sentenceCaseList(values: Array<string | null | undefined>, separator = ' · '): string {
  const items = values.map((value) => sentenceCaseData(value, '')).filter(Boolean);
  return items.length ? items.join(separator) : 'No disponible';
}

export function upperDisplay(value: string | null | undefined, fallback = 'No disponible'): string {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text ? text.toLocaleUpperCase('es-MX') : fallback;
}

export function displayPersonName(value: string | null | undefined, fallback = 'No disponible'): string {
  return upperDisplay(value, fallback);
}

export function displayRoleName(value: string | null | undefined, fallback = 'No disponible'): string {
  return upperDisplay(value, fallback);
}

export function displayStructure(value: string | null | undefined, fallback = 'No disponible'): string {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text || fallback;
}

export function displayCertificationName(value: string | null | undefined, fallback = 'No disponible'): string {
  return upperDisplay(value, fallback);
}
