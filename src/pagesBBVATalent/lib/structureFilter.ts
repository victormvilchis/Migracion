import type { StructureOption } from '../types/structureCatalog';

export interface StructureFilterSelection { level2: string; level3: string; }

export const STRUCTURE_ALL = 'ALL';

export function encodeStructureFilter(level2?: string | null, level3?: string | null): string {
  const l2 = String(level2 ?? '').trim();
  const l3 = String(level3 ?? '').trim();
  if (l3) return `L3::${encodeURIComponent(l2)}::${encodeURIComponent(l3)}`;
  if (l2) return `L2::${encodeURIComponent(l2)}`;
  return STRUCTURE_ALL;
}

export function decodeStructureFilter(value: string): StructureFilterSelection {
  if (!value || value === STRUCTURE_ALL) return { level2: '', level3: '' };
  const [kind, a = '', b = ''] = value.split('::');
  if (kind === 'L3') return { level2: decodeURIComponent(a), level3: decodeURIComponent(b) };
  if (kind === 'L2') return { level2: decodeURIComponent(a), level3: '' };
  return { level2: '', level3: '' };
}

export function buildStructureFilterOptions(items: StructureOption[]) {
  const level2 = items.filter((item) => item.level === 2).sort((a,b)=>a.name.localeCompare(b.name,'es-MX',{sensitivity:'base'}));
  const level3 = items.filter((item) => item.level === 3).sort((a,b)=>`${a.parentName ?? ''} ${a.name}`.localeCompare(`${b.parentName ?? ''} ${b.name}`,'es-MX',{sensitivity:'base'}));
  return [
    { value: STRUCTURE_ALL, label: 'Todas las estructuras' },
    ...level2.map((item) => ({ value: encodeStructureFilter(item.name, ''), label: item.name.toUpperCase(), description: 'Nivel 2' })),
    ...level3.map((item) => ({ value: encodeStructureFilter(item.parentName ?? '', item.name), label: `↳ ${item.name.toUpperCase()}`, description: `${(item.parentName ?? 'Sin nivel 2').toUpperCase()} · Nivel 3` })),
  ];
}
