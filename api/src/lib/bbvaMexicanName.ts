function trim(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

const SURNAME_PARTICLES = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'SAN', 'SANTA', 'VAN', 'VON']);

/**
 * Divide nombres completos con la convención operativa usada en México:
 * uno o varios nombres de pila + dos apellidos, preservando partículas
 * como DE LOS / DE LA / DEL dentro del primer apellido.
 *
 * Si el origen viene como "Apellidos, Nombres" se respeta explícitamente.
 */
export function splitMexicanFullName(fullName: string): { firstName: string; lastName: string | null } {
  const cleanName = trim(fullName);
  if (!cleanName) return { firstName: '', lastName: null };

  if (cleanName.includes(',')) {
    const [last, ...firstParts] = cleanName.split(',');
    const first = trim(firstParts.join(','));
    if (first) return { firstName: first.slice(0, 120), lastName: trim(last).slice(0, 180) || null };
  }

  const parts = cleanName.split(' ').filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0].slice(0, 120), lastName: null };
  if (parts.length === 2) return { firstName: parts[0].slice(0, 120), lastName: parts[1].slice(0, 180) };

  // En ausencia de columnas separadas, los dos últimos tokens son los dos apellidos.
  // Después se absorben las partículas contiguas que forman parte del primer apellido.
  let surnameStart = Math.max(1, parts.length - 2);
  while (surnameStart > 1 && SURNAME_PARTICLES.has(parts[surnameStart - 1].toUpperCase())) surnameStart -= 1;

  const firstName = parts.slice(0, surnameStart).join(' ');
  const lastName = parts.slice(surnameStart).join(' ');
  return { firstName: firstName.slice(0, 120), lastName: lastName.slice(0, 180) || null };
}
