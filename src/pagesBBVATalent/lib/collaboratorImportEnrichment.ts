import type { ImportSourceRow } from '../types/collaboratorImport';
import { normalizedHeader, type ParsedExcelRow } from './xlsxFirstSheet';

const ALIASES = {
  fullName: ['NOMBRE EXTERNO', 'NOMBRE COMPLETO', 'COLABORADOR', 'NOMBRE', 'NAME'],
  softtekCode: ['IS', 'CODIGO SOFTTEK', 'CÓDIGO SOFTTEK'],
  corporateUser: ['XM', 'USUARIO BBVA', 'USUARIO CORPORATIVO'],
  softtekEmail: ['CORREO SOFTTEK', 'CORREO', 'CORREO ELECTRONICO', 'CORREO ELECTRÓNICO', 'EMAIL', 'E-MAIL'],
  bbvaEmail: ['CORREO BBVA', 'CORREO CORPORATIVO'],
  deliveryManager: ['DM', 'DELIVERY MANAGER'],
  profile: ['PERFIL', 'PERFIL CLIENTE'],
  startDate: ['FECHA ALTA BBVA', 'FECHA ALTA XM'],
  hireDate: ['FECHA CONTRATACION SOFTTEK', 'FECHA CONTRATACIÓN SOFTTEK', 'FECHA INGRESO SOFTTEK', 'FECHA ALTA -SAP', 'FECHA ALTA SAP'],
} as const;

type FieldKey = keyof typeof ALIASES;

const CANONICAL: Record<FieldKey, string> = {
  fullName: 'NOMBRE EXTERNO',
  softtekCode: 'IS',
  corporateUser: 'XM',
  softtekEmail: 'CORREO SOFTTEK',
  bbvaEmail: 'CORREO BBVA',
  deliveryManager: 'DM',
  profile: 'PERFIL',
  startDate: 'FECHA ALTA BBVA',
  hireDate: 'FECHA CONTRATACIÓN SOFTTEK',
};

export interface ImportEnrichmentSummary {
  matched: number;
  unmatched: number;
  ambiguous: number;
  fieldsAdded: number;
  sourceRows: number;
  warnings: string[];
}

function normalizeValue(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function aliasValue(values: Record<string, string>, aliases: readonly string[]): string | null {
  const wanted = new Set(aliases.map(normalizedHeader));
  for (const [header, raw] of Object.entries(values)) {
    if (!wanted.has(normalizedHeader(header))) continue;
    const value = String(raw ?? '').trim();
    if (!value || ['#N/A', 'N/A', 'NA', 'TBD', 'NULL'].includes(normalizeValue(value))) return null;
    return value;
  }
  return null;
}

function hasValue(values: Record<string, string>, aliases: readonly string[]): boolean {
  return Boolean(aliasValue(values, aliases));
}

function personIdentity(row: { values: Record<string, string> }) {
  return {
    softtekCode: normalizeValue(aliasValue(row.values, ALIASES.softtekCode)),
    corporateUser: normalizeValue(aliasValue(row.values, ALIASES.corporateUser)),
    softtekEmail: normalizeValue(aliasValue(row.values, ALIASES.softtekEmail)),
    bbvaEmail: normalizeValue(aliasValue(row.values, ALIASES.bbvaEmail)),
    fullName: normalizeValue(aliasValue(row.values, ALIASES.fullName)),
  };
}

function addIndex(map: Map<string, ParsedExcelRow[]>, key: string, row: ParsedExcelRow) {
  if (!key) return;
  map.set(key, [...(map.get(key) ?? []), row]);
}

function displayName(row: ParsedExcelRow): string {
  return aliasValue(row.values, ALIASES.fullName) ?? `Fila ${row.rowNumber}`;
}

export function enrichImportRows(mainRows: ImportSourceRow[], supplementaryRows: ParsedExcelRow[]): { rows: ImportSourceRow[]; summary: ImportEnrichmentSummary } {
  const indexes = {
    softtekCode: new Map<string, ParsedExcelRow[]>(),
    corporateUser: new Map<string, ParsedExcelRow[]>(),
    softtekEmail: new Map<string, ParsedExcelRow[]>(),
    bbvaEmail: new Map<string, ParsedExcelRow[]>(),
    fullName: new Map<string, ParsedExcelRow[]>(),
  };

  for (const row of supplementaryRows) {
    const identity = personIdentity(row);
    addIndex(indexes.softtekCode, identity.softtekCode, row);
    addIndex(indexes.corporateUser, identity.corporateUser, row);
    addIndex(indexes.softtekEmail, identity.softtekEmail, row);
    addIndex(indexes.bbvaEmail, identity.bbvaEmail, row);
    addIndex(indexes.fullName, identity.fullName, row);
  }

  const warnings: string[] = [];
  const duplicateChecks: Array<[string, Map<string, ParsedExcelRow[]>]> = [
    ['IS', indexes.softtekCode],
    ['Usuario BBVA/XM', indexes.corporateUser],
    ['Correo Softtek', indexes.softtekEmail],
    ['Correo BBVA', indexes.bbvaEmail],
  ];
  for (const [label, index] of duplicateChecks) {
    for (const [value, rows] of index.entries()) {
      if (rows.length <= 1) continue;
      warnings.push(`${label} “${value}” aparece en ${rows.length} registros del archivo complementario: ${rows.slice(0, 3).map(displayName).join(', ')}${rows.length > 3 ? '…' : ''}.`);
      if (warnings.length >= 12) break;
    }
    if (warnings.length >= 12) break;
  }

  let matched = 0;
  let unmatched = 0;
  let ambiguous = 0;
  let fieldsAdded = 0;

  const enriched = mainRows.map((main) => {
    const identity = personIdentity(main);
    const candidates = new Map<number, ParsedExcelRow>();
    let hadAmbiguousStrongKey = false;

    const collectUnique = (index: Map<string, ParsedExcelRow[]>, key: string) => {
      if (!key) return;
      const items = index.get(key) ?? [];
      if (items.length === 1) candidates.set(items[0].rowNumber, items[0]);
      else if (items.length > 1) hadAmbiguousStrongKey = true;
    };

    collectUnique(indexes.softtekCode, identity.softtekCode);
    collectUnique(indexes.corporateUser, identity.corporateUser);
    collectUnique(indexes.softtekEmail, identity.softtekEmail);
    collectUnique(indexes.bbvaEmail, identity.bbvaEmail);

    let match: ParsedExcelRow | null = null;
    if (candidates.size === 1) match = candidates.values().next().value ?? null;
    else if (candidates.size > 1) {
      ambiguous += 1;
      return main;
    } else if (!hadAmbiguousStrongKey && identity.fullName) {
      const byName = indexes.fullName.get(identity.fullName) ?? [];
      if (byName.length === 1) match = byName[0];
      else if (byName.length > 1) {
        ambiguous += 1;
        return main;
      }
    }

    if (!match) {
      if (hadAmbiguousStrongKey) ambiguous += 1;
      else unmatched += 1;
      return main;
    }

    matched += 1;
    const values = { ...main.values };
    const mergeField = (field: FieldKey) => {
      if (hasValue(values, ALIASES[field])) return;
      const complement = aliasValue(match!.values, ALIASES[field]);
      if (!complement) return;
      values[CANONICAL[field]] = complement;
      fieldsAdded += 1;
    };

    mergeField('softtekCode');
    mergeField('corporateUser');
    mergeField('softtekEmail');
    mergeField('bbvaEmail');
    mergeField('deliveryManager');
    mergeField('profile');
    mergeField('startDate');
    mergeField('hireDate');

    return { ...main, values };
  });

  return {
    rows: enriched,
    summary: {
      matched,
      unmatched,
      ambiguous,
      fieldsAdded,
      sourceRows: supplementaryRows.length,
      warnings,
    },
  };
}
