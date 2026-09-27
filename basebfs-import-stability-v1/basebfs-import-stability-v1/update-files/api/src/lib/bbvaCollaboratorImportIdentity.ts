export interface ImportIdentityRow {
  rowKey: string;
  rowNumber: number;
  fullName: string;
  softtekCode: string | null;
  corporateUser: string | null;
  email: string | null;
  bbvaEmail: string | null;
}

export interface ImportIdentityPerson {
  personId: string;
  fullName: string;
  softtekCode: string | null;
  corporateUser: string | null;
  email: string | null;
  bbvaEmail: string | null;
}

export interface ImportIdentityMatch<TPerson extends ImportIdentityPerson> {
  person: TPerson | null;
  conflict: string | null;
  referencedPersonIds: string[];
}

export interface ImportDuplicateIdentityIssue {
  rowKey: string;
  rowNumber: number;
  fullName: string;
  code: string;
  message: string;
}

type IdentityIndex<TPerson extends ImportIdentityPerson> = {
  softtekCode: Map<string, TPerson[]>;
  corporateUser: Map<string, TPerson[]>;
  email: Map<string, TPerson[]>;
  bbvaEmail: Map<string, TPerson[]>;
  fullName: Map<string, TPerson[]>;
};

function normalizeIdentity(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function addToIndex<TPerson extends ImportIdentityPerson>(map: Map<string, TPerson[]>, value: string | null | undefined, person: TPerson): void {
  const key = normalizeIdentity(value);
  if (!key) return;
  map.set(key, [...(map.get(key) ?? []), person]);
}

export function buildImportIdentityIndex<TPerson extends ImportIdentityPerson>(people: TPerson[]): IdentityIndex<TPerson> {
  const index: IdentityIndex<TPerson> = {
    softtekCode: new Map(),
    corporateUser: new Map(),
    email: new Map(),
    bbvaEmail: new Map(),
    fullName: new Map(),
  };
  for (const person of people) {
    addToIndex(index.softtekCode, person.softtekCode, person);
    addToIndex(index.corporateUser, person.corporateUser, person);
    addToIndex(index.email, person.email, person);
    addToIndex(index.bbvaEmail, person.bbvaEmail, person);
    addToIndex(index.fullName, person.fullName, person);
  }
  return index;
}

function uniquePeople<TPerson extends ImportIdentityPerson>(groups: Array<TPerson[] | undefined>): TPerson[] {
  const byId = new Map<string, TPerson>();
  for (const group of groups) {
    for (const person of group ?? []) byId.set(person.personId, person);
  }
  return [...byId.values()];
}

export function resolveImportIdentity<TPerson extends ImportIdentityPerson>(
  row: ImportIdentityRow,
  index: IdentityIndex<TPerson>,
): ImportIdentityMatch<TPerson> {
  const strongGroups: Array<TPerson[] | undefined> = [];
  if (row.softtekCode) strongGroups.push(index.softtekCode.get(normalizeIdentity(row.softtekCode)));
  if (row.corporateUser) strongGroups.push(index.corporateUser.get(normalizeIdentity(row.corporateUser)));
  if (row.email) strongGroups.push(index.email.get(normalizeIdentity(row.email)));
  if (row.bbvaEmail) strongGroups.push(index.bbvaEmail.get(normalizeIdentity(row.bbvaEmail)));

  const strongMatches = uniquePeople(strongGroups);
  if (strongMatches.length === 1) {
    return { person: strongMatches[0], conflict: null, referencedPersonIds: [strongMatches[0].personId] };
  }
  if (strongMatches.length > 1) {
    return {
      person: null,
      conflict: 'Los identificadores fuertes del Excel (IS, Usuario BBVA o correos) apuntan a personas diferentes. Revisa la fila antes de importarla.',
      referencedPersonIds: strongMatches.map((person) => person.personId),
    };
  }

  const nameMatches = index.fullName.get(normalizeIdentity(row.fullName)) ?? [];
  if (nameMatches.length === 1) {
    return { person: nameMatches[0], conflict: null, referencedPersonIds: [nameMatches[0].personId] };
  }
  if (nameMatches.length > 1) {
    return {
      person: null,
      conflict: 'No hubo coincidencia por identificadores fuertes y el nombre coincide con más de una persona existente.',
      referencedPersonIds: nameMatches.map((person) => person.personId),
    };
  }
  return { person: null, conflict: null, referencedPersonIds: [] };
}

const duplicateFields = [
  { key: 'softtekCode' as const, label: 'IS', code: 'DUPLICATE_SOFTTEK_CODE' },
  { key: 'corporateUser' as const, label: 'Usuario BBVA', code: 'DUPLICATE_CORPORATE_USER' },
  { key: 'email' as const, label: 'Correo Softtek', code: 'DUPLICATE_SOFTTEK_EMAIL' },
  { key: 'bbvaEmail' as const, label: 'Correo BBVA', code: 'DUPLICATE_BBVA_EMAIL' },
];

export function findDuplicateImportIdentityIssues(rows: ImportIdentityRow[]): ImportDuplicateIdentityIssue[] {
  const issues: ImportDuplicateIdentityIssue[] = [];

  for (const field of duplicateFields) {
    const groups = new Map<string, ImportIdentityRow[]>();
    for (const row of rows) {
      const value = normalizeIdentity(row[field.key]);
      if (!value) continue;
      groups.set(value, [...(groups.get(value) ?? []), row]);
    }
    for (const [value, group] of groups) {
      if (group.length < 2) continue;
      const rowList = group.map((row) => row.rowNumber).sort((a, b) => a - b).join(', ');
      for (const row of group) {
        issues.push({
          rowKey: row.rowKey,
          rowNumber: row.rowNumber,
          fullName: row.fullName,
          code: field.code,
          message: `${field.label} ${value} está repetido dentro del Excel (filas ${rowList}).`,
        });
      }
    }
  }

  const fallbackNameGroups = new Map<string, ImportIdentityRow[]>();
  for (const row of rows) {
    const hasStrongIdentity = Boolean(row.softtekCode || row.corporateUser || row.email || row.bbvaEmail);
    if (hasStrongIdentity) continue;
    const name = normalizeIdentity(row.fullName);
    if (!name) continue;
    fallbackNameGroups.set(name, [...(fallbackNameGroups.get(name) ?? []), row]);
  }
  for (const [name, group] of fallbackNameGroups) {
    if (group.length < 2) continue;
    const rowList = group.map((row) => row.rowNumber).sort((a, b) => a - b).join(', ');
    for (const row of group) {
      issues.push({
        rowKey: row.rowKey,
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        code: 'DUPLICATE_NAME_WITHOUT_STRONG_IDENTITY',
        message: `El nombre ${name} aparece repetido sin un identificador fuerte que permita distinguir las filas (${rowList}).`,
      });
    }
  }

  return issues;
}
