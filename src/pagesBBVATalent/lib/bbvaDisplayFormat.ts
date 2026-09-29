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


/** Versión compacta exclusivamente visual para celdas de tabla; no modifica datos persistidos. */
export function compactRoleDisplayForTable(profile: string | null | undefined, technologyProfile?: string | null): string {
  let role = upperDisplay(profile, '').replace(/^ANALISTA PROGRAMADOR\s+/u, '');
  role = role
    .replace(/\bDATA ENGINEER\b/gu, 'DATA ENG.')
    .replace(/\bESPECIAL\b/gu, 'ESP.')
    .replace(/\bCOMMODITY\b/gu, 'COM.');
  let family = upperDisplay(technologyProfile, '')
    .replace(/\bDESARROLLADOR\b/gu, 'DEV')
    .replace(/\bESPECIALIZADA\b/gu, 'ESP.');
  return [role, family].filter(Boolean).join(' · ') || 'NO DISPONIBLE';
}

export function compactTechnologyDisplayForTable(technology: string | null | undefined, expertise?: string | null): string {
  const name = upperDisplay(technology, '');
  const level = upperDisplay(expertise, '');
  return [name, level].filter(Boolean).join(' · ') || 'NO DISPONIBLE';
}
