import { createHash } from 'node:crypto';
import type {
  ImportApplyRequest,
  ImportApplyResult,
  ImportCatalogAction,
  ImportChangeDecision,
  ImportChangedCandidate,
  ImportErrorItem,
  ImportFieldChange,
  ImportNewCandidate,
  ImportPossibleLow,
  ImportPreviewRequest,
  ImportPreviewResponse,
  ImportResolvedItem,
  ImportSourceRow,
} from './bbvaCollaboratorImportDomain.js';
import {
  CollaboratorImportRepository,
  type ImportPersonInput,
  type ImportPersonRecord,
} from './bbvaCollaboratorImportRepository.js';
import { CollaboratorCertificationService } from './bbvaCollaboratorCertificationService.js';
import { PersonLifecycleService } from './bbvaPersonLifecycleService.js';

const repository = new CollaboratorImportRepository();
const certificationService = new CollaboratorCertificationService();
const lifecycleService = new PersonLifecycleService();

const HEADER_ALIASES = {
  fullName: ['NOMBRE EXTERNO', 'NOMBRE COMPLETO', 'COLABORADOR'],
  softtekCode: ['IS', 'CODIGO SOFTTEK', 'CÓDIGO SOFTTEK'],
  corporateUser: ['USUARIO CORPORATIVO', 'USUARIO BBVA'],
  email: ['CORREO', 'CORREO ELECTRONICO', 'CORREO ELECTRÓNICO', 'EMAIL', 'E-MAIL'],
  profile: ['PERFIL'],
  technologyProfile: ['PERFIL TECNOLOGICO', 'PERFIL TECNOLÓGICO'],
  currentTechnology: ['TECNOLOGIA EN LA QUE SE CERTIFICA', 'TECNOLOGÍA EN LA QUE SE CERTIFICA', 'TECNOLOGIA ACTUAL', 'TECNOLOGÍA ACTUAL'],
  expertise: ['EXPERTISE', 'SENIORITY'],
  startDate: ['FECHA DE ALTA'],
  hireDate: ['FECHA DE CONTRATACION', 'FECHA DE CONTRATACIÓN'],
  resourceStatus: ['ESTATUS DEL RECURSO', 'ESTADO DEL RECURSO'],
} as const;

type ImportField = keyof typeof HEADER_ALIASES | 'lifecycleState';

interface NormalizedRow {
  rowKey: string;
  rowNumber: number;
  fullName: string;
  softtekCode: string | null;
  corporateUser: string | null;
  email: string | null;
  profile: string | null;
  technologyProfile: string | null;
  currentTechnology: string | null;
  expertise: string | null;
  startDate: string | null;
  hireDate: string | null;
  resourceStatus: string | null;
  source: ImportSourceRow;
}

interface MatchResult {
  row: NormalizedRow;
  person: ImportPersonRecord | null;
  conflict: string | null;
}

const FIELD_LABELS: Record<ImportField, string> = {
  fullName: 'Nombre',
  softtekCode: 'IS',
  corporateUser: 'Usuario corporativo',
  email: 'Correo electrónico',
  profile: 'Perfil',
  technologyProfile: 'Perfil tecnológico',
  currentTechnology: 'Tecnología actual',
  expertise: 'Nivel de experiencia',
  startDate: 'Fecha de alta',
  hireDate: 'Fecha de contratación',
  resourceStatus: 'Estado del recurso',
  lifecycleState: 'Estado operativo',
};

function normalizeHeader(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function clean(value: unknown, maxLength: number): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, maxLength) : null;
}

function upper(value: unknown, maxLength: number): string | null {
  return clean(value, maxLength)?.toUpperCase() ?? null;
}

function valueByAliases(values: Record<string, string>, aliases: readonly string[]): string | null {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  for (const [header, value] of Object.entries(values)) {
    if (normalizedAliases.has(normalizeHeader(header))) return clean(value, 1000);
  }
  return null;
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate) && !Number.isNaN(Date.parse(`${candidate}T00:00:00Z`))) return candidate;
  const slash = candidate.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const year = Number(slash[3]);
    const iso = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    if (!Number.isNaN(Date.parse(`${iso}T00:00:00Z`))) return iso;
  }
  return null;
}

function hash(...parts: Array<string | null | undefined>): string {
  return createHash('sha256').update(parts.map((part) => String(part ?? '')).join('|')).digest('hex');
}

function canonicalCatalog(value: string | null): string | null {
  return value ? value.replace(/\s+/g, ' ').trim().toUpperCase() : null;
}

function inferSeniority(profile: string | null, expertise: string | null): string | null {
  const source = `${profile ?? ''} ${expertise ?? ''}`.toUpperCase();
  const match = source.match(/\b(JR|STD|SR)\b/);
  return match?.[1] ?? null;
}

function splitName(fullName: string): { firstName: string; lastName: string | null } {
  const cleanName = fullName.replace(/\s+/g, ' ').trim();
  if (cleanName.includes(',')) {
    const [last, ...firstParts] = cleanName.split(',');
    const first = firstParts.join(',').trim();
    if (first) return { firstName: first.slice(0, 120), lastName: clean(last, 180) };
  }
  const parts = cleanName.split(' ').filter(Boolean);
  if (parts.length <= 1) return { firstName: cleanName.slice(0, 120), lastName: null };
  return { firstName: parts[0].slice(0, 120), lastName: parts.slice(1).join(' ').slice(0, 180) };
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeRow(source: ImportSourceRow): NormalizedRow | ImportErrorItem {
  const fullName = valueByAliases(source.values, HEADER_ALIASES.fullName);
  const rowKeySeed = fullName || `ROW_${source.rowNumber}`;
  const rowKey = hash(normalizeKey(rowKeySeed), String(source.rowNumber));
  if (!fullName) return { rowKey, rowNumber: source.rowNumber, fullName: '', message: 'La fila no contiene NOMBRE EXTERNO.' };

  const rawStartDate = valueByAliases(source.values, HEADER_ALIASES.startDate);
  const rawHireDate = valueByAliases(source.values, HEADER_ALIASES.hireDate);
  const startDate = normalizeDate(rawStartDate);
  const hireDate = normalizeDate(rawHireDate);
  if (rawStartDate && !startDate) return { rowKey, rowNumber: source.rowNumber, fullName, message: `FECHA DE ALTA no tiene un formato válido: ${rawStartDate}.` };
  if (rawHireDate && !hireDate) return { rowKey, rowNumber: source.rowNumber, fullName, message: `FECHA DE CONTRATACIÓN no tiene un formato válido: ${rawHireDate}.` };

  const email = clean(valueByAliases(source.values, HEADER_ALIASES.email), 255)?.toLowerCase() ?? null;
  if (email && !isEmail(email)) return { rowKey, rowNumber: source.rowNumber, fullName, message: `El correo del Excel no tiene un formato válido: ${email}.` };

  const softtekCode = upper(valueByAliases(source.values, HEADER_ALIASES.softtekCode), 80);
  const corporateUser = upper(valueByAliases(source.values, HEADER_ALIASES.corporateUser), 100);
  const stableRowKey = hash(normalizeKey(fullName), normalizeKey(softtekCode), normalizeKey(corporateUser), normalizeKey(email));

  return {
    rowKey: stableRowKey,
    rowNumber: source.rowNumber,
    fullName,
    softtekCode,
    corporateUser,
    email,
    profile: canonicalCatalog(valueByAliases(source.values, HEADER_ALIASES.profile)),
    technologyProfile: canonicalCatalog(valueByAliases(source.values, HEADER_ALIASES.technologyProfile)),
    currentTechnology: canonicalCatalog(valueByAliases(source.values, HEADER_ALIASES.currentTechnology)),
    expertise: upper(valueByAliases(source.values, HEADER_ALIASES.expertise), 40),
    startDate,
    hireDate,
    resourceStatus: upper(valueByAliases(source.values, HEADER_ALIASES.resourceStatus), 80),
    source,
  };
}

function indexPeople(people: ImportPersonRecord[]) {
  const maps = {
    softtekCode: new Map<string, ImportPersonRecord[]>(),
    corporateUser: new Map<string, ImportPersonRecord[]>(),
    email: new Map<string, ImportPersonRecord[]>(),
    fullName: new Map<string, ImportPersonRecord[]>(),
  };
  const add = (map: Map<string, ImportPersonRecord[]>, key: string, person: ImportPersonRecord) => {
    if (!key) return;
    map.set(key, [...(map.get(key) ?? []), person]);
  };
  for (const person of people) {
    add(maps.softtekCode, normalizeKey(person.softtekCode), person);
    add(maps.corporateUser, normalizeKey(person.corporateUser), person);
    add(maps.email, normalizeKey(person.email), person);
    add(maps.fullName, normalizeKey(person.fullName), person);
  }
  return maps;
}

function matchRows(rows: NormalizedRow[], people: ImportPersonRecord[]): MatchResult[] {
  const maps = indexPeople(people);
  return rows.map((row) => {
    const matches = new Map<string, ImportPersonRecord>();
    const collect = (items: ImportPersonRecord[] | undefined) => items?.forEach((item) => matches.set(item.personId, item));
    if (row.softtekCode) collect(maps.softtekCode.get(normalizeKey(row.softtekCode)));
    if (row.corporateUser) collect(maps.corporateUser.get(normalizeKey(row.corporateUser)));
    if (row.email) collect(maps.email.get(normalizeKey(row.email)));
    collect(maps.fullName.get(normalizeKey(row.fullName)));
    if (matches.size > 1) return { row, person: null, conflict: 'Los identificadores del Excel coinciden con más de una persona existente.' };
    return { row, person: matches.values().next().value ?? null, conflict: null };
  });
}

function currentField(person: ImportPersonRecord, field: ImportField): string | null {
  if (field === 'fullName') return person.fullName;
  if (field === 'lifecycleState') return person.collaboratorStatus === 'ACTIVE' ? 'Colaborador activo' : person.activeTalentId ? 'Banco de talento' : 'Colaborador inactivo';
  if (field === 'resourceStatus') return null;
  const value = person[field as keyof ImportPersonRecord];
  return typeof value === 'string' ? value : null;
}

function excelField(row: NormalizedRow, field: ImportField): string | null {
  if (field === 'lifecycleState') return 'Colaborador activo';
  if (field === 'resourceStatus') return row.resourceStatus;
  const value = row[field as keyof NormalizedRow];
  return typeof value === 'string' ? value : null;
}

function shouldCompare(field: ImportField, excelValue: string | null): boolean {
  if (field === 'lifecycleState') return true;
  if (field === 'resourceStatus') return false;
  return Boolean(excelValue);
}

function buildChange(person: ImportPersonRecord, row: NormalizedRow, field: ImportField): ImportFieldChange | null {
  const currentValue = currentField(person, field);
  const excelValue = excelField(row, field);
  if (!shouldCompare(field, excelValue)) return null;
  if (normalizeKey(currentValue) === normalizeKey(excelValue)) return null;
  const resolutionKey = hash(person.personId, field, normalizeKey(currentValue), normalizeKey(excelValue));
  return {
    resolutionKey,
    field,
    label: FIELD_LABELS[field],
    currentValue,
    excelValue,
    decision: 'APPLY_EXCEL',
    resolvedPreviously: false,
  };
}

function resourceIsLow(status: string | null): boolean {
  if (!status) return false;
  const key = normalizeKey(status);
  return ['BAJA', 'BAJA BBVA', 'INACTIVO', 'INACTIVE', 'DESASIGNADO'].some((value) => key.includes(value));
}

async function catalogActions(row: NormalizedRow): Promise<ImportCatalogAction[]> {
  const actions: ImportCatalogAction[] = [];
  const candidates: Array<{ type: ImportCatalogAction['type']; value: string | null }> = [
    { type: 'profile', value: row.profile },
    { type: 'technologyProfile', value: row.technologyProfile },
    { type: 'technology', value: row.currentTechnology },
  ];
  for (const candidate of candidates) {
    if (!candidate.value) continue;
    const existing = await repository.findCatalog(candidate.type, candidate.value);
    actions.push({ type: candidate.type, value: candidate.value, action: existing?.status === 'ACTIVE' ? 'USE_EXISTING' : 'CREATE' });
  }
  return actions;
}

async function toInput(row: NormalizedRow, existing: ImportPersonRecord | null, actorEmail: string, emailOverride?: string | null, decisions?: Map<string, ImportChangeDecision>, changes?: ImportFieldChange[]): Promise<ImportPersonInput> {
  const applyField = (field: ImportField, excel: string | null, current: string | null): string | null => {
    const change = changes?.find((item) => item.field === field);
    if (!change) return excel || current;
    return (decisions?.get(change.resolutionKey) ?? change.decision) === 'APPLY_EXCEL' ? excel : current;
  };

  const resolvedFullName = applyField('fullName', row.fullName, existing?.fullName ?? null) || row.fullName;
  const names = splitName(resolvedFullName);
  const profile = canonicalCatalog(applyField('profile', row.profile, existing?.profile ?? null));
  const technologyProfile = canonicalCatalog(applyField('technologyProfile', row.technologyProfile, existing?.technologyProfile ?? null));
  const currentTechnology = canonicalCatalog(applyField('currentTechnology', row.currentTechnology, existing?.currentTechnology ?? null));
  const expertise = upper(applyField('expertise', row.expertise, existing?.expertise ?? null), 40) ?? inferSeniority(profile, row.expertise || existing?.expertise || null);

  const profileOption = profile ? await repository.ensureCatalog('profile', profile, actorEmail, inferSeniority(profile, expertise)) : null;
  const technologyProfileOption = technologyProfile ? await repository.ensureCatalog('technologyProfile', technologyProfile, actorEmail) : null;
  const technologyOption = currentTechnology ? await repository.ensureCatalog('technology', currentTechnology, actorEmail) : null;
  const resolvedEmail = clean(emailOverride, 255)?.toLowerCase() || applyField('email', row.email, existing?.email ?? null) || '';
  if (!isEmail(resolvedEmail)) throw new Error(`Captura un correo válido para ${resolvedFullName}.`);

  return {
    softtekCode: upper(applyField('softtekCode', row.softtekCode, existing?.softtekCode ?? null), 80),
    corporateUser: upper(applyField('corporateUser', row.corporateUser, existing?.corporateUser ?? null), 100),
    email: resolvedEmail,
    firstName: names.firstName,
    lastName: names.lastName,
    profile: profileOption?.name ?? null,
    profileCatalogId: profileOption?.id ?? null,
    technologyProfile: technologyProfileOption?.name ?? null,
    technologyProfileCatalogId: technologyProfileOption?.id ?? null,
    currentTechnology: technologyOption?.name ?? null,
    currentTechnologyCatalogId: technologyOption?.id ?? null,
    expertise,
    startDate: applyField('startDate', row.startDate, existing?.startDate ?? null),
    hireDate: applyField('hireDate', row.hireDate, existing?.hireDate ?? null),
    notes: existing?.notes ?? null,
  };
}

function collectAllChanges(preview: ImportPreviewResponse): Map<string, ImportFieldChange[]> {
  const grouped = new Map<string, ImportFieldChange[]>();
  for (const item of preview.changedItems) grouped.set(item.rowKey, [...item.changes]);
  for (const item of preview.resolvedPreviously) grouped.set(item.rowKey, [...(grouped.get(item.rowKey) ?? []), item.change]);
  return grouped;
}

export class CollaboratorImportService {
  async preview(payload: ImportPreviewRequest): Promise<ImportPreviewResponse> {
    const inputRows = Array.isArray(payload?.rows) ? payload.rows.slice(0, 5000) : [];
    if (!inputRows.length) throw Object.assign(new Error('El Excel no contiene filas válidas para analizar.'), { statusCode: 400 });

    const errors: ImportErrorItem[] = [];
    const rows: NormalizedRow[] = [];
    for (const source of inputRows) {
      const normalized = normalizeRow(source);
      if ('message' in normalized) errors.push(normalized);
      else rows.push(normalized);
    }

    const duplicateKeys = new Map<string, NormalizedRow[]>();
    for (const row of rows) {
      const key = normalizeKey(row.softtekCode || row.email || row.corporateUser || row.fullName);
      duplicateKeys.set(key, [...(duplicateKeys.get(key) ?? []), row]);
    }
    const duplicateRows = new Set<number>();
    for (const group of duplicateKeys.values()) if (group.length > 1) group.forEach((row) => duplicateRows.add(row.rowNumber));

    const people = await repository.listPeople();
    const matches = matchRows(rows, people);
    const newItems: ImportNewCandidate[] = [];
    const changedItems: ImportChangedCandidate[] = [];
    const conflicts: ImportPreviewResponse['conflicts'] = [];
    const matchedPersonIds = new Set<string>();
    const allChanges: Array<{ row: NormalizedRow; person: ImportPersonRecord; change: ImportFieldChange }> = [];

    for (const match of matches) {
      if (duplicateRows.has(match.row.rowNumber)) {
        conflicts.push({ rowKey: match.row.rowKey, rowNumber: match.row.rowNumber, fullName: match.row.fullName, message: 'La misma persona aparece más de una vez en el Excel.' });
        continue;
      }
      if (match.conflict) {
        conflicts.push({ rowKey: match.row.rowKey, rowNumber: match.row.rowNumber, fullName: match.row.fullName, message: match.conflict });
        continue;
      }
      if (!match.person) {
        newItems.push({
          rowKey: match.row.rowKey,
          rowNumber: match.row.rowNumber,
          fullName: match.row.fullName,
          email: match.row.email,
          softtekCode: match.row.softtekCode,
          corporateUser: match.row.corporateUser,
          profile: match.row.profile,
          technologyProfile: match.row.technologyProfile,
          currentTechnology: match.row.currentTechnology,
          expertise: match.row.expertise,
          startDate: match.row.startDate,
          catalogActions: await catalogActions(match.row),
        });
        continue;
      }

      matchedPersonIds.add(match.person.personId);
      const fields: ImportField[] = ['fullName','softtekCode','corporateUser','email','profile','technologyProfile','currentTechnology','expertise','startDate','hireDate'];
      const changes = fields.map((field) => buildChange(match.person as ImportPersonRecord, match.row, field)).filter((item): item is ImportFieldChange => Boolean(item));
      if (match.person.collaboratorStatus !== 'ACTIVE') {
        const lifecycle = buildChange(match.person, match.row, 'lifecycleState');
        if (lifecycle) changes.push(lifecycle);
      }
      changes.forEach((change) => allChanges.push({ row: match.row, person: match.person as ImportPersonRecord, change }));
      if (changes.length > 0) {
        changedItems.push({
          rowKey: match.row.rowKey,
          rowNumber: match.row.rowNumber,
          collaboratorId: match.person.collaboratorId ?? '',
          personId: match.person.personId,
          fullName: match.row.fullName,
          reactivationRequired: match.person.collaboratorStatus !== 'ACTIVE',
          changes,
          catalogActions: await catalogActions(match.row),
        });
      }
    }

    const stored = await repository.getStoredDecisions(allChanges.map((item) => item.change.resolutionKey));
    const resolvedPreviously: ImportResolvedItem[] = [];
    for (const item of changedItems) {
      const unresolved: ImportFieldChange[] = [];
      for (const change of item.changes) {
        const decision = stored.get(change.resolutionKey);
        if (decision) {
          const resolved = { ...change, decision, resolvedPreviously: true };
          resolvedPreviously.push({ rowKey: item.rowKey, rowNumber: item.rowNumber, collaboratorId: item.collaboratorId, fullName: item.fullName, change: resolved });
        } else unresolved.push(change);
      }
      item.changes = unresolved;
    }

    const explicitLows = new Set(matches.filter((item) => item.person && resourceIsLow(item.row.resourceStatus)).map((item) => item.person?.personId as string));
    const possibleLows: ImportPossibleLow[] = people
      .filter((person) => person.collaboratorStatus === 'ACTIVE' && (!matchedPersonIds.has(person.personId) || explicitLows.has(person.personId)))
      .map((person) => ({
        collaboratorId: person.collaboratorId as string,
        personId: person.personId,
        fullName: person.fullName,
        email: person.email,
        profile: person.profile,
        currentTechnology: person.currentTechnology,
        decision: 'REVIEW',
      }));

    return {
      totalRowsAnalyzed: rows.length,
      ignoredRows: Math.max(0, inputRows.length - rows.length - errors.length),
      newItems,
      changedItems: changedItems.filter((item) => item.changes.length > 0 || item.reactivationRequired),
      possibleLows,
      conflicts,
      errors,
      resolvedPreviously,
    };
  }

  async apply(payload: ImportApplyRequest, actorEmail: string): Promise<ImportApplyResult> {
    const preview = await this.preview({ rows: payload.rows });
    const normalizedRows = new Map<string, NormalizedRow>();
    for (const source of payload.rows) {
      const row = normalizeRow(source);
      if (!('message' in row)) normalizedRows.set(row.rowKey, row);
    }
    const people = await repository.listPeople();
    const peopleById = new Map(people.map((person) => [person.personId, person]));
    const changesByRow = collectAllChanges(preview);
    const decisions = new Map<string, ImportChangeDecision>();
    for (const changes of changesByRow.values()) {
      for (const change of changes) decisions.set(change.resolutionKey, payload.decisions?.[change.resolutionKey] ?? change.decision);
    }

    const result: ImportApplyResult = { created: 0, updated: 0, reactivated: 0, movedToTalentBank: 0, skipped: preview.conflicts.length + preview.errors.length, errors: [] };

    for (const item of preview.newItems) {
      const row = normalizedRows.get(item.rowKey);
      if (!row) continue;
      try {
        const input = await toInput(row, null, actorEmail, payload.emails?.[item.rowKey] ?? item.email);
        const created = await repository.create(input, actorEmail);
        await certificationService.synchronize(created.collaboratorId, actorEmail);
        result.created += 1;
      } catch (error) {
        result.skipped += 1;
        result.errors.push({ rowNumber: item.rowNumber, name: item.fullName, message: (error as Error).message });
      }
    }

    const changedGroups = new Map<string, { rowNumber: number; fullName: string; personId: string; collaboratorId: string; reactivationRequired: boolean }>();
    for (const item of preview.changedItems) changedGroups.set(item.rowKey, { rowNumber: item.rowNumber, fullName: item.fullName, personId: item.personId, collaboratorId: item.collaboratorId, reactivationRequired: item.reactivationRequired });
    for (const item of preview.resolvedPreviously) {
      if (!changedGroups.has(item.rowKey)) {
        const person = people.find((candidate) => candidate.collaboratorId === item.collaboratorId);
        if (person) changedGroups.set(item.rowKey, { rowNumber: item.rowNumber, fullName: item.fullName, personId: person.personId, collaboratorId: item.collaboratorId, reactivationRequired: person.collaboratorStatus !== 'ACTIVE' });
      }
    }

    for (const [rowKey, group] of changedGroups) {
      const row = normalizedRows.get(rowKey);
      const person = peopleById.get(group.personId);
      if (!row || !person) continue;
      try {
        const changes = changesByRow.get(rowKey) ?? [];
        const lifecycleChange = changes.find((change) => change.field === 'lifecycleState');
        const shouldReactivate = group.reactivationRequired && (!lifecycleChange || (decisions.get(lifecycleChange.resolutionKey) ?? lifecycleChange.decision) === 'APPLY_EXCEL');
        const hasDataChange = changes.some((change) => change.field !== 'lifecycleState' && (decisions.get(change.resolutionKey) ?? change.decision) === 'APPLY_EXCEL');
        for (const change of changes) await repository.saveDecision(change.resolutionKey, decisions.get(change.resolutionKey) ?? change.decision, actorEmail);
        if (!shouldReactivate && !hasDataChange) continue;

        const input = await toInput(row, person, actorEmail, null, decisions, changes);
        let collaboratorId = person.collaboratorId;
        if (shouldReactivate) {
          collaboratorId = await repository.reactivate(person, input, actorEmail);
          result.reactivated += 1;
        } else if (person.collaboratorStatus === 'ACTIVE') {
          await repository.update(person, input, actorEmail);
          result.updated += 1;
        } else {
          result.skipped += 1;
          continue;
        }
        if (collaboratorId) await certificationService.synchronize(collaboratorId, actorEmail);
      } catch (error) {
        result.skipped += 1;
        result.errors.push({ rowNumber: group.rowNumber, name: group.fullName, message: (error as Error).message });
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    for (const low of preview.possibleLows) {
      const decision = payload.lowDecisions?.[low.collaboratorId] ?? 'REVIEW';
      if (decision !== 'DEACTIVATE') continue;
      try {
        await lifecycleService.moveCollaboratorToTalent(low.collaboratorId, {
          reasonCode: 'UNASSIGNED',
          effectiveDate: today,
          talentStage: 'UNASSIGNED',
          notes: 'Movimiento generado desde la importación Excel de colaboradores.',
        }, actorEmail);
        result.movedToTalentBank += 1;
      } catch (error) {
        result.errors.push({ rowNumber: null, name: low.fullName, message: (error as Error).message });
      }
    }

    return result;
  }
}
