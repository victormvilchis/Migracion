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
  ImportCertificationPreview,
  ImportCertificationBlock,
} from './bbvaCollaboratorImportDomain.js';
import {
  CollaboratorImportRepository,
  type ImportPersonInput,
  type ImportPersonRecord,
} from './bbvaCollaboratorImportRepository.js';
import { CollaboratorCertificationService } from './bbvaCollaboratorCertificationService.js';
import { CollaboratorCertificationRepository } from './bbvaCollaboratorCertificationRepository.js';
import {
  IMPORT_CERTIFICATION_BLOCKS,
  certificationBlockLabel,
  importCertificationResolutionKey,
  parseCertificationEvidence,
  type ImportCertificationCatalogConfig,
  type ImportCertificationCurrentState,
  type ParsedCertificationEvidence,
} from './bbvaCollaboratorImportCertificationDomain.js';
import { PersonLifecycleService } from './bbvaPersonLifecycleService.js';

const repository = new CollaboratorImportRepository();
const certificationService = new CollaboratorCertificationService();
const certificationRepository = new CollaboratorCertificationRepository();
const lifecycleService = new PersonLifecycleService();

const HEADER_ALIASES = {
  fullName: ['NOMBRE EXTERNO', 'NOMBRE COMPLETO', 'COLABORADOR', 'NOMBRE', 'NAME'],
  softtekCode: ['IS', 'CODIGO SOFTTEK', 'CÓDIGO SOFTTEK'],
  corporateUser: ['XM', 'USUARIO CORPORATIVO', 'USUARIO BBVA'],
  email: ['CORREO SOFTTEK', 'CORREO', 'CORREO ELECTRONICO', 'CORREO ELECTRÓNICO', 'EMAIL', 'E-MAIL'],
  bbvaEmail: ['CORREO BBVA', 'CORREO CORPORATIVO'],
  deliveryManager: ['DM', 'DELIVERY MANAGER', 'DELIVERY MANAGER SOFTTEK'],
  profile: ['PERFIL', 'PERFIL CLIENTE'],
  technologyProfile: ['PERFIL TECNOLOGICO', 'PERFIL TECNOLÓGICO'],
  currentTechnology: ['TECNOLOGIA EN LA QUE SE CERTIFICA', 'TECNOLOGÍA EN LA QUE SE CERTIFICA', 'TECNOLOGIA ACTUAL', 'TECNOLOGÍA ACTUAL'],
  expertise: ['EXPERTISE', 'SENIORITY'],
  startDate: ['FECHA ALTA BBVA', 'FECHA ALTA XM'],
  hireDate: ['FECHA CONTRATACION SOFTTEK', 'FECHA CONTRATACIÓN SOFTTEK', 'FECHA INGRESO SOFTTEK', 'FECHA ALTA -SAP', 'FECHA ALTA SAP', 'FECHA DE ALTA', 'FECHA DE CONTRATACION', 'FECHA DE CONTRATACIÓN'],
  resourceStatus: ['ESTATUS DEL RECURSO', 'ESTADO DEL RECURSO', 'STATUS SOFTTEK'],
} as const;

type ImportField = keyof typeof HEADER_ALIASES | 'lifecycleState';

interface NormalizedRow {
  rowKey: string;
  rowNumber: number;
  fullName: string;
  softtekCode: string | null;
  corporateUser: string | null;
  email: string | null;
  bbvaEmail: string | null;
  deliveryManager: string | null;
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
  corporateUser: 'Usuario BBVA',
  email: 'Correo Softtek',
  bbvaEmail: 'Correo BBVA',
  deliveryManager: 'DM',
  profile: 'Perfil',
  technologyProfile: 'Perfil tecnológico',
  currentTechnology: 'Tecnología actual',
  expertise: 'Nivel de experiencia',
  startDate: 'Fecha de alta BBVA',
  hireDate: 'Fecha de contratación Softtek',
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
  if (!fullName) return { rowKey, rowNumber: source.rowNumber, fullName: '', message: 'La fila no contiene una columna de nombre reconocible.' };

  const rawStartDate = valueByAliases(source.values, HEADER_ALIASES.startDate);
  const rawHireDate = valueByAliases(source.values, HEADER_ALIASES.hireDate);
  const startDate = normalizeDate(rawStartDate);
  const hireDate = normalizeDate(rawHireDate);
  if (rawStartDate && !startDate) return { rowKey, rowNumber: source.rowNumber, fullName, message: `FECHA ALTA BBVA no tiene un formato válido: ${rawStartDate}.` };
  if (rawHireDate && !hireDate) return { rowKey, rowNumber: source.rowNumber, fullName, message: `FECHA DE CONTRATACIÓN SOFTTEK no tiene un formato válido: ${rawHireDate}.` };

  const email = clean(valueByAliases(source.values, HEADER_ALIASES.email), 255)?.toLowerCase() ?? null;
  if (email && !isEmail(email)) return { rowKey, rowNumber: source.rowNumber, fullName, message: `El correo Softtek del Excel no tiene un formato válido: ${email}.` };
  const bbvaEmail = clean(valueByAliases(source.values, HEADER_ALIASES.bbvaEmail), 255)?.toLowerCase() ?? null;
  if (bbvaEmail && !isEmail(bbvaEmail)) return { rowKey, rowNumber: source.rowNumber, fullName, message: `El correo BBVA del Excel no tiene un formato válido: ${bbvaEmail}.` };
  const deliveryManager = clean(valueByAliases(source.values, HEADER_ALIASES.deliveryManager), 180);

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
    bbvaEmail,
    deliveryManager,
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
    bbvaEmail: new Map<string, ImportPersonRecord[]>(),
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
    add(maps.bbvaEmail, normalizeKey(person.bbvaEmail), person);
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
    if (row.bbvaEmail) collect(maps.bbvaEmail.get(normalizeKey(row.bbvaEmail)));
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
    actions.push({ type: candidate.type, value: candidate.value, action: existing ? (existing.status === 'ACTIVE' ? 'USE_EXISTING' : 'INACTIVE') : 'CREATE' });
  }
  return actions;
}

async function toInput(row: NormalizedRow, existing: ImportPersonRecord | null, actorEmail: string, emailOverride?: string | null, decisions?: Map<string, ImportChangeDecision>, changes?: ImportFieldChange[], softtekCodeOverride?: string | null, deliveryManagerOverride?: string | null): Promise<ImportPersonInput> {
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
    softtekCode: upper(softtekCodeOverride ?? applyField('softtekCode', row.softtekCode, existing?.softtekCode ?? null), 80),
    corporateUser: upper(applyField('corporateUser', row.corporateUser, existing?.corporateUser ?? null), 100),
    bbvaEmail: clean(applyField('bbvaEmail', row.bbvaEmail, existing?.bbvaEmail ?? null), 255)?.toLowerCase() ?? null,
    deliveryManager: clean(deliveryManagerOverride, 180) || clean(applyField('deliveryManager', row.deliveryManager, existing?.deliveryManager ?? null), 180) || (() => { throw new Error(`DM es obligatorio para ${resolvedFullName}.`); })(),
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
  for (const item of preview.resolvedPreviously) if (item.change) grouped.set(item.rowKey, [...(grouped.get(item.rowKey) ?? []), item.change]);
  return grouped;
}


interface PreparedCertification {
  preview: ImportCertificationPreview;
  evidence: ParsedCertificationEvidence;
  config: ImportCertificationCatalogConfig | null;
  conflictKeys: Array<{ key: string; code: string; message: string }>;
}

function formatBoolean(value: boolean | null): string | null {
  return value === null ? null : value ? 'Sí' : 'No';
}

function formatNumber(value: number | null): string | null {
  return value === null ? null : String(value);
}

function catalogNameForBlock(block: ImportCertificationBlock): string | null {
  if (block === 'DEVELOPMENT_SECURITY') return 'DESARROLLO SEGURO';
  if (block === 'NORMATIVE_TESTING') return 'NORMATIVA & TESTING';
  if (block === 'ONE') return 'ONE';
  if (block === 'AGILE') return 'AGILE';
  if (block === 'JIRA') return 'JIRA';
  if (block === 'GITHUB') return 'GITHUB';
  return null;
}

function chooseCertificationConfig(
  block: ImportCertificationBlock,
  row: NormalizedRow,
  person: ImportPersonRecord | null,
  catalog: ImportCertificationCatalogConfig[],
  currentStates: ImportCertificationCurrentState[],
): { config: ImportCertificationCatalogConfig | null; issue: string | null } {
  if (block !== 'TECHNOLOGICAL') {
    const name = catalogNameForBlock(block);
    const config = catalog.find((item) => normalizeKey(item.name) === normalizeKey(name)) ?? null;
    return { config, issue: config ? null : `No existe una configuración activa de catálogo para ${certificationBlockLabel(block)}.` };
  }
  if (!row.currentTechnology) return { config: null, issue: 'La fila no informa TECNOLOGÍA EN LA QUE SE CERTIFICA.' };
  const candidates = catalog.filter((item) => item.certificationType === 'TECHNOLOGICAL' && normalizeKey(item.technologyName) === normalizeKey(row.currentTechnology));
  if (!candidates.length) return { config: null, issue: `No existe una certificación tecnológica activa asociada a ${row.currentTechnology}.` };
  if (candidates.length === 1) return { config: candidates[0], issue: null };

  const exact = candidates.filter((item) => normalizeKey(item.name) === normalizeKey(row.currentTechnology));
  if (exact.length === 1) return { config: exact[0], issue: null };

  const activeCurrent = candidates.filter((candidate) => currentStates.some((state) => state.certificationId === candidate.id && state.applicable && state.baseStatus !== 'NOT_APPLICABLE'));
  if (activeCurrent.length === 1) return { config: activeCurrent[0], issue: null };

  const profileText = normalizeKey(`${row.profile ?? ''} ${row.technologyProfile ?? ''} ${person?.profile ?? ''}`);
  const profileMatches = candidates.filter((candidate) => {
    const candidateName = normalizeKey(candidate.name);
    const technology = normalizeKey(row.currentTechnology);
    const discriminator = candidateName.replace(technology, '').trim();
    return discriminator.length >= 3 && profileText.includes(discriminator);
  });
  if (profileMatches.length === 1) return { config: profileMatches[0], issue: null };

  return { config: null, issue: `La tecnología ${row.currentTechnology} tiene más de una certificación aplicable (${candidates.map((item) => item.name).join(', ')}) y el perfil no permite elegir una de forma inequívoca.` };
}

function rawStatusToCalculated(rawStatus: string | null): string | null {
  const key = normalizeKey(rawStatus);
  if (!key) return null;
  if (key === 'NO APLICA') return 'NOT_APPLICABLE';
  if (key === 'VIGENTE - REGULAR') return 'VALID';
  if (key === 'VIGENTE - PROXIMO A VENCER') return 'EXPIRING';
  if (key === 'VENCIDO' || key === 'VENCIDA') return 'EXPIRED';
  if (key.startsWith('SIN PRESENTAR')) return 'PENDING';
  if (['APROBADO','APROBADA','SI','FORMADO'].includes(key)) return 'VALID';
  if (key === 'PENDIENTE DE FORMACION' || key === 'PENDIENTE') return 'PENDING';
  return null;
}

function currentForConfig(states: ImportCertificationCurrentState[], config: ImportCertificationCatalogConfig | null): ImportCertificationCurrentState | null {
  if (!config) return null;
  return states.find((state) => state.certificationId === config.id) ?? null;
}

function hasApproval(state: ImportCertificationCurrentState | null): boolean {
  return Boolean(state && (state.baseStatus === 'APPROVED' || state.approvedDate || state.attempts.some((attempt) => attempt.result === 'APPROVED')));
}

function buildCertificationFields(current: ImportCertificationCurrentState | null, evidence: ParsedCertificationEvidence) {
  return [
    { field:'applicable' as const,label:'Aplicabilidad',currentValue:current ? formatBoolean(current.applicable) : null,excelValue:formatBoolean(evidence.applicable),calculatedValue:formatBoolean(evidence.applicable),origin:current?.lastDataSource ?? current?.source ?? null },
    { field:'certificationStatus' as const,label:'Estado de certificación',currentValue:current?.importedCertificationStatus ?? current?.calculatedStatus ?? null,excelValue:evidence.rawCertificationStatus,calculatedValue:evidence.calculatedStatus,origin:current?.lastDataSource ?? current?.source ?? null },
    { field:'examStatus' as const,label:'Estado del examen',currentValue:current?.importedExamStatus ?? null,excelValue:evidence.rawExamStatus,calculatedValue:evidence.baseStatus,origin:current?.lastDataSource ?? current?.source ?? null },
    { field:'applicationDate' as const,label:'Fecha de aplicación',currentValue:current?.applicationDate ?? null,excelValue:evidence.applicationDate,calculatedValue:evidence.applicationDate,origin:current?.lastDataSource ?? current?.source ?? null },
    { field:'score10' as const,label:'Promedio',currentValue:formatNumber(current?.lastScore10 ?? null),excelValue:formatNumber(evidence.score10),calculatedValue:formatNumber(evidence.score10),origin:current?.lastDataSource ?? current?.source ?? null },
    { field:'administrativeAttempt' as const,label:'Intento administrativo',currentValue:formatNumber(current?.importedAttemptNumber ?? null),excelValue:formatNumber(evidence.administrativeAttempt),calculatedValue:evidence.administrativeAttempt === 0 ? 'Aprobación sin intento formal #0' : formatNumber(evidence.administrativeAttempt),origin:current?.lastDataSource ?? current?.source ?? null },
    { field:'lifecycle' as const,label:'Proceso',currentValue:hasApproval(current) ? 'RECERTIFICATION' : current ? 'INITIAL' : null,excelValue:null,calculatedValue:evidence.lifecycle,origin:current?.lastDataSource ?? current?.source ?? null },
    { field:'initialDueDate' as const,label:'Fecha límite inicial',currentValue:current?.initialDueDate ?? null,excelValue:evidence.normativeLimitDate,calculatedValue:evidence.initialDueDate,origin:current?.lastDataSource ?? current?.source ?? null },
    { field:'expirationDate' as const,label:'Vencimiento',currentValue:current?.expirationDate ?? null,excelValue:null,calculatedValue:evidence.expirationDate,origin:current?.lastDataSource ?? current?.source ?? null },
    { field:'lastApproval' as const,label:'Última aprobación',currentValue:current?.approvedDate ?? null,excelValue:evidence.baseStatus === 'APPROVED' ? evidence.applicationDate : null,calculatedValue:evidence.approvedDate,origin:current?.lastDataSource ?? current?.source ?? null },
  ];
}

function effectiveEvidenceChanged(current: ImportCertificationCurrentState | null, evidence: ParsedCertificationEvidence): boolean {
  if (!current) return true;
  if (current.lastImportFingerprint === evidence.fingerprint
    && current.applicable === (evidence.applicable !== false)
    && current.baseStatus === (evidence.baseStatus ?? (evidence.applicable === false ? 'NOT_APPLICABLE' : 'PENDING'))
    && current.applicationDate === (evidence.applicable === false ? null : evidence.applicationDate)
    && current.initialDueDate === evidence.initialDueDate
    && current.lastScore10 === evidence.score10
    && current.importedAttemptNumber === evidence.administrativeAttempt) return false;
  return true;
}

function prepareCertifications(
  row: NormalizedRow,
  person: ImportPersonRecord | null,
  catalog: ImportCertificationCatalogConfig[],
  stateMap: Map<string, ImportCertificationCurrentState[]>,
): PreparedCertification[] {
  const states = person ? (stateMap.get(person.personId) ?? []) : [];
  const prepared: PreparedCertification[] = [];
  for (const block of IMPORT_CERTIFICATION_BLOCKS as readonly ImportCertificationBlock[]) {
    const selected = chooseCertificationConfig(block, row, person, catalog, states);
    const current = currentForConfig(states, selected.config);
    const evidence = parseCertificationEvidence({
      source: row.source,
      block,
      startDate: row.startDate ?? person?.startDate ?? null,
      config: selected.config,
      hadPreviousApproval: hasApproval(current),
    });
    if (!evidence) continue;
    const issues = [...evidence.issues];
    const nonApplicableWithoutCatalog = !selected.config && evidence.applicable === false;
    if (selected.issue && !nonApplicableWithoutCatalog) {
      issues.push({ code: 'INVALID_CATALOG_MAPPING', message: selected.issue, blocking: true });
    }
    const hasChanges = selected.config
      ? effectiveEvidenceChanged(current, evidence)
      : issues.some((issue) => issue.blocking && issue.code !== 'INVALID_CATALOG_MAPPING');
    if ((current?.source === 'MANUAL' || current?.lastDataSource === 'MANUAL') && hasChanges) {
      issues.push({ code:'MANUAL_HISTORY_DIFFERENCE', message:`${evidence.label} contiene información manual y el Excel propone valores diferentes.`, blocking:true });
    }
    if (current && evidence.administrativeAttempt !== null && evidence.administrativeAttempt > 0 && evidence.applicationDate && evidence.baseStatus && ['APPROVED','FAILED'].includes(evidence.baseStatus)) {
      const manualAttempt = current.attempts.find((attempt) => attempt.cycleNumber === current.currentCycle && attempt.attemptNumber === evidence.administrativeAttempt && attempt.source === 'MANUAL');
      if (manualAttempt) {
        const expectedResult = evidence.baseStatus === 'APPROVED' ? 'APPROVED' : 'FAILED';
        const sameManualEvidence = manualAttempt.applicationDate === evidence.applicationDate
          && manualAttempt.result === expectedResult
          && (manualAttempt.score10 === null || evidence.score10 === null || manualAttempt.score10 === evidence.score10);
        if (!sameManualEvidence) issues.push({ code:'MANUAL_ATTEMPT_DIFFERENCE', message:`${evidence.label} intenta ocupar el intento ${evidence.administrativeAttempt}, pero ya existe un intento manual diferente.`, blocking:true });
      }
    }
    const excelCalculated = rawStatusToCalculated(evidence.rawCertificationStatus);
    let ruleGap: string | null = null;
    if (evidence.expirationDate && selected.config?.expiringSoonDays == null && normalizeKey(evidence.rawCertificationStatus).includes('PROXIMO A VENCER')) {
      ruleGap = `${evidence.label}: ExpiringSoonDays no está configurado; el umbral no se infirió del Excel.`;
    } else if (excelCalculated && evidence.calculatedStatus && excelCalculated !== evidence.calculatedStatus && selected.config?.expiringSoonDays != null) {
      issues.push({ code:'EXCEL_STATUS_DIFFERS_FROM_CALCULATION', message:`${evidence.label}: el estado del Excel (${evidence.rawCertificationStatus}) difiere del estado calculado (${evidence.calculatedStatus}).`, blocking:true });
    }

    const resolutionKey = importCertificationResolutionKey({ rowIdentity: row.rowKey, block, issueCode:'RECONCILE', sourceFingerprint:evidence.fingerprint, calculatedStatus:evidence.calculatedStatus });
    const conflictKeys = issues.filter((issue) => issue.blocking && !issue.code.startsWith('INVALID_')).map((issue) => ({
      key: importCertificationResolutionKey({ rowIdentity: row.rowKey, block, issueCode:issue.code, sourceFingerprint:evidence.fingerprint, calculatedStatus:evidence.calculatedStatus }),
      code: issue.code,
      message: issue.message,
    }));
    prepared.push({
      config:selected.config,
      evidence,
      conflictKeys,
      preview:{
        block,label:evidence.label,certificationId:selected.config?.id ?? null,certificationName:selected.config?.name ?? null,
        resolutionKey,sourceFingerprint:evidence.fingerprint,decision:'APPLY_EXCEL',resolvedPreviously:false,hasChanges,
        currentSource:current?.lastDataSource ?? current?.source ?? null,currentStatus:current?.calculatedStatus ?? null,
        excelStatus:evidence.rawCertificationStatus,calculatedStatus:evidence.calculatedStatus,ruleGap,
        fields:buildCertificationFields(current,evidence),issues,
      },
    });
  }
  return prepared;
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

    const [people, certificationCatalog, certificationStates] = await Promise.all([
      repository.listPeople(),
      certificationRepository.listImportCatalog(),
      certificationRepository.listImportStates(),
    ]);
    const matches = matchRows(rows, people);
    const newItems: ImportNewCandidate[] = [];
    const changedItems: ImportChangedCandidate[] = [];
    const conflicts: ImportPreviewResponse['conflicts'] = [];
    const matchedPersonIds = new Set<string>();
    const allChanges: Array<{ row: NormalizedRow; person: ImportPersonRecord; change: ImportFieldChange }> = [];
    const preparedByRow = new Map<string, PreparedCertification[]>();

    for (const match of matches) {
      if (duplicateRows.has(match.row.rowNumber)) {
        conflicts.push({ rowKey: match.row.rowKey, rowNumber: match.row.rowNumber, fullName: match.row.fullName, message: 'La misma persona aparece más de una vez en el Excel.' });
        continue;
      }
      if (match.conflict) {
        conflicts.push({ rowKey: match.row.rowKey, rowNumber: match.row.rowNumber, fullName: match.row.fullName, message: match.conflict });
        continue;
      }

      const rowCatalogActions = await catalogActions(match.row);
      const inactiveCatalogs = rowCatalogActions.filter((action) => action.action === 'INACTIVE');
      if (inactiveCatalogs.length > 0) {
        const labels: Record<ImportCatalogAction['type'], string> = { profile: 'perfil', technologyProfile: 'perfil tecnológico', technology: 'tecnología' };
        for (const inactive of inactiveCatalogs) {
          conflicts.push({
            rowKey: match.row.rowKey,
            rowNumber: match.row.rowNumber,
            fullName: match.row.fullName,
            message: `El ${labels[inactive.type]} “${inactive.value}” existe en el catálogo pero está inactivo. Reactívalo explícitamente en Administración o corrige el Excel; la importación no lo reactivará automáticamente.`,
          });
        }
        continue;
      }

      const prepared = prepareCertifications(match.row, match.person, certificationCatalog, certificationStates);
      preparedByRow.set(match.row.rowKey, prepared);
      for (const cert of prepared) {
        for (const issue of cert.preview.issues.filter((candidate) => candidate.code.startsWith('INVALID_'))) {
          errors.push({ rowKey:match.row.rowKey,rowNumber:match.row.rowNumber,fullName:match.row.fullName,message:issue.message });
        }
      }

      if (!match.person) {
        newItems.push({
          rowKey: match.row.rowKey,rowNumber: match.row.rowNumber,fullName: match.row.fullName,email: match.row.email,
          softtekCode: match.row.softtekCode,corporateUser: match.row.corporateUser,bbvaEmail: match.row.bbvaEmail,deliveryManager: match.row.deliveryManager,profile: match.row.profile,
          technologyProfile: match.row.technologyProfile,currentTechnology: match.row.currentTechnology,expertise: match.row.expertise,
          startDate: match.row.startDate,hireDate: match.row.hireDate,catalogActions: rowCatalogActions,certifications: prepared.map((item) => item.preview),
        });
        continue;
      }

      matchedPersonIds.add(match.person.personId);
      const fields: ImportField[] = ['fullName','softtekCode','corporateUser','email','bbvaEmail','deliveryManager','profile','technologyProfile','currentTechnology','expertise','startDate','hireDate'];
      const changes = fields.map((field) => buildChange(match.person as ImportPersonRecord, match.row, field)).filter((item): item is ImportFieldChange => Boolean(item));
      if (match.person.collaboratorStatus !== 'ACTIVE') {
        const lifecycle = buildChange(match.person, match.row, 'lifecycleState');
        if (lifecycle) changes.push(lifecycle);
      }
      changes.forEach((change) => allChanges.push({ row: match.row, person: match.person as ImportPersonRecord, change }));
      if (changes.length > 0 || prepared.some((item) => item.preview.hasChanges)) {
        changedItems.push({
          rowKey: match.row.rowKey,rowNumber: match.row.rowNumber,collaboratorId: match.person.collaboratorId ?? '',personId: match.person.personId,
          fullName: match.row.fullName,reactivationRequired: match.person.collaboratorStatus !== 'ACTIVE',changes,
          catalogActions: rowCatalogActions,certifications: prepared.map((item) => item.preview),
        });
      }
    }

    const certResolutionKeys = [...preparedByRow.values()].flatMap((items) => items.flatMap((item) => [item.preview.resolutionKey, ...item.conflictKeys.map((conflict) => conflict.key)]));
    const stored = await repository.getStoredDecisions([...allChanges.map((item) => item.change.resolutionKey), ...certResolutionKeys]);
    const resolvedPreviously: ImportResolvedItem[] = [];

    for (const item of changedItems) {
      const unresolved: ImportFieldChange[] = [];
      for (const change of item.changes) {
        const decision = stored.get(change.resolutionKey);
        if (decision) resolvedPreviously.push({ rowKey:item.rowKey,rowNumber:item.rowNumber,collaboratorId:item.collaboratorId,fullName:item.fullName,change:{...change,decision,resolvedPreviously:true} });
        else unresolved.push(change);
      }
      item.changes = unresolved;
    }

    for (const candidate of [...newItems, ...changedItems]) {
      const prepared = preparedByRow.get(candidate.rowKey) ?? [];
      for (const cert of prepared) {
        if (!cert.preview.hasChanges && cert.conflictKeys.length === 0) continue;
        const certDecision = stored.get(cert.preview.resolutionKey);
        const storedConflictDecisions = cert.conflictKeys.map((conflict) => stored.get(conflict.key));
        const allConflictsResolved = cert.conflictKeys.length > 0 && storedConflictDecisions.every(Boolean);
        const previouslyResolved = Boolean(certDecision) || allConflictsResolved;
        if (previouslyResolved) {
          const resolvedDecision = certDecision
            ?? (storedConflictDecisions.some((decision) => decision === 'KEEP_CURRENT') ? 'KEEP_CURRENT' : 'APPLY_EXCEL');
          resolvedPreviously.push({
            rowKey:candidate.rowKey,rowNumber:candidate.rowNumber,
            collaboratorId:'collaboratorId' in candidate ? candidate.collaboratorId : '',fullName:candidate.fullName,
            certification:{...cert.preview,decision:resolvedDecision,resolvedPreviously:true},
          });
          cert.preview.decision = resolvedDecision;
          cert.preview.resolvedPreviously = true;
          cert.preview.hasChanges = false;
          continue;
        }
        for (const conflict of cert.conflictKeys) {
          conflicts.push({
            rowKey:candidate.rowKey,rowNumber:candidate.rowNumber,fullName:candidate.fullName,message:conflict.message,
            resolutionKey:conflict.key,decision:'KEEP_CURRENT',certificationBlock:cert.preview.block,certificationLabel:cert.preview.label,
            issueCode:conflict.code,currentValue:cert.preview.currentStatus,excelValue:cert.preview.excelStatus,calculatedValue:cert.preview.calculatedStatus,
          });
        }
      }
      if ('changes' in candidate) {
        const techChange = candidate.changes.find((change) => change.field === 'currentTechnology' && change.currentValue && change.excelValue);
        if (techChange) conflicts.push({
          rowKey:candidate.rowKey,rowNumber:candidate.rowNumber,fullName:candidate.fullName,
          message:`La tecnología principal actual (${techChange.currentValue}) difiere de la del Excel (${techChange.excelValue}).`,
          resolutionKey:techChange.resolutionKey,decision:'KEEP_CURRENT',issueCode:'PRIMARY_TECHNOLOGY_MISMATCH',
          currentValue:techChange.currentValue,excelValue:techChange.excelValue,calculatedValue:techChange.excelValue,
        });
      }
    }

    const explicitLows = new Set(matches.filter((item) => item.person && resourceIsLow(item.row.resourceStatus)).map((item) => item.person?.personId as string));
    const possibleLows: ImportPossibleLow[] = people
      .filter((person) => person.collaboratorStatus === 'ACTIVE' && (!matchedPersonIds.has(person.personId) || explicitLows.has(person.personId)))
      .map((person) => ({ collaboratorId:person.collaboratorId as string,personId:person.personId,fullName:person.fullName,email:person.email,profile:person.profile,currentTechnology:person.currentTechnology,decision:'REVIEW' }));

    const certPreviews = [...newItems.flatMap((item) => item.certifications), ...changedItems.flatMap((item) => item.certifications)];
    return {
      totalRowsAnalyzed:rows.length,ignoredRows:Math.max(0,inputRows.length-rows.length-errors.length),newItems,
      changedItems:changedItems.filter((item) => item.changes.length > 0 || item.reactivationRequired || item.certifications.some((cert) => cert.hasChanges)),
      possibleLows,conflicts,errors,resolvedPreviously,
      certificationChanges:certPreviews.filter((item) => item.hasChanges).length,
      certificationResults:certPreviews.filter((item) => {
        const exam = item.fields.find((field) => field.field === 'examStatus');
        return item.hasChanges && Boolean(exam?.excelValue) && ['APPROVED','FAILED'].includes(exam?.calculatedValue ?? '');
      }).length,
      certificationRuleGaps:[...new Set(certPreviews.map((item) => item.ruleGap).filter((item): item is string => Boolean(item)))],
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
    for (const changes of changesByRow.values()) for (const change of changes) decisions.set(change.resolutionKey,payload.decisions?.[change.resolutionKey] ?? change.decision);

    const unresolvedRows = new Set<string>();
    for (const conflict of preview.conflicts) {
      if (!conflict.resolutionKey || !payload.decisions?.[conflict.resolutionKey]) unresolvedRows.add(conflict.rowKey);
      else decisions.set(conflict.resolutionKey,payload.decisions[conflict.resolutionKey]);
    }
    const errorRows = new Set(preview.errors.map((item) => item.rowKey));
    const result: ImportApplyResult = {
      created:0,updated:0,reactivated:0,movedToTalentBank:0,skipped:0,certificationUpdated:0,resultsRegistered:0,
      reusedDecisions:preview.resolvedPreviously.length,errors:[],
    };

    const [certificationCatalog, certificationStates] = await Promise.all([certificationRepository.listImportCatalog(),certificationRepository.listImportStates()]);

    const applyCertifications = async (row: NormalizedRow, person: ImportPersonRecord | null, personId: string) => {
      const prepared = prepareCertifications(row, person, certificationCatalog, certificationStates);
      for (const cert of prepared) {
        if (!cert.preview.hasChanges) continue;
        const storedCertDecisions = await repository.getStoredDecisions([
          cert.preview.resolutionKey,
          ...cert.conflictKeys.map((conflict) => conflict.key),
        ]);
        const certDecision = payload.decisions?.[cert.preview.resolutionKey]
          ?? storedCertDecisions.get(cert.preview.resolutionKey)
          ?? cert.preview.decision;
        const blocking = cert.conflictKeys;
        const conflictDecision = (key: string): ImportChangeDecision => payload.decisions?.[key] ?? storedCertDecisions.get(key) ?? 'KEEP_CURRENT';
        const keepBecauseConflict = blocking.some((conflict) => conflictDecision(conflict.key) === 'KEEP_CURRENT');
        if (certDecision === 'KEEP_CURRENT' || keepBecauseConflict) {
          for (const conflict of blocking) await repository.saveDecision(conflict.key,conflictDecision(conflict.key),actorEmail);
          await repository.saveDecision(cert.preview.resolutionKey,'KEEP_CURRENT',actorEmail);
          continue;
        }
        if (!cert.config) {
          for (const conflict of blocking) await repository.saveDecision(conflict.key,conflictDecision(conflict.key),actorEmail);
          await repository.saveDecision(cert.preview.resolutionKey,'APPLY_EXCEL',actorEmail);
          continue;
        }
        const applied = await certificationRepository.applyImportedEvidence({ personId,config:cert.config,block:cert.preview.block,evidence:cert.evidence,actorEmail });
        for (const conflict of blocking) await repository.saveDecision(conflict.key,conflictDecision(conflict.key),actorEmail);
        await repository.saveDecision(cert.preview.resolutionKey,'APPLY_EXCEL',actorEmail);
        if (applied.changed) result.certificationUpdated += 1;
        if (applied.resultRegistered) result.resultsRegistered += 1;
      }
    };

    for (const item of preview.newItems) {
      const row = normalizedRows.get(item.rowKey);
      if (!row) continue;
      if (unresolvedRows.has(item.rowKey) || errorRows.has(item.rowKey)) { result.skipped += 1; continue; }
      try {
        const requestedIs = upper(payload.softtekCodes?.[item.rowKey] ?? item.softtekCode, 80);
        if (!requestedIs) throw new Error(`Captura un IS válido para ${item.fullName}.`);
        const duplicateIs = people.find((candidate) => normalizeKey(candidate.softtekCode) === normalizeKey(requestedIs));
        if (duplicateIs) throw new Error(`El IS ${requestedIs} ya pertenece a ${duplicateIs.fullName}. Vuelve a validar el Excel para reconciliar la identidad en lugar de crear una persona duplicada.`);
        const input = await toInput(row,null,actorEmail,payload.emails?.[item.rowKey] ?? item.email,undefined,undefined,requestedIs,payload.deliveryManagers?.[item.rowKey] ?? item.deliveryManager);
        const created = await repository.create(input,actorEmail);
        await certificationService.synchronize(created.collaboratorId,actorEmail);
        await applyCertifications(row,null,created.personId);
        result.created += 1;
      } catch (error) {
        result.skipped += 1;
        result.errors.push({ rowNumber:item.rowNumber,name:item.fullName,message:(error as Error).message });
      }
    }

    const changedGroups = new Map<string, { rowNumber:number; fullName:string; personId:string; collaboratorId:string; reactivationRequired:boolean }>();
    for (const item of preview.changedItems) changedGroups.set(item.rowKey,{ rowNumber:item.rowNumber,fullName:item.fullName,personId:item.personId,collaboratorId:item.collaboratorId,reactivationRequired:item.reactivationRequired });
    for (const item of preview.resolvedPreviously) {
      if (!item.collaboratorId || changedGroups.has(item.rowKey)) continue;
      const person = people.find((candidate) => candidate.collaboratorId === item.collaboratorId);
      if (person) changedGroups.set(item.rowKey,{ rowNumber:item.rowNumber,fullName:item.fullName,personId:person.personId,collaboratorId:item.collaboratorId,reactivationRequired:person.collaboratorStatus !== 'ACTIVE' });
    }

    for (const [rowKey,group] of changedGroups) {
      const row = normalizedRows.get(rowKey);
      const person = peopleById.get(group.personId);
      if (!row || !person) continue;
      if (unresolvedRows.has(rowKey) || errorRows.has(rowKey)) { result.skipped += 1; continue; }
      try {
        const changes = changesByRow.get(rowKey) ?? [];
        for (const change of changes) decisions.set(change.resolutionKey,payload.decisions?.[change.resolutionKey] ?? change.decision);
        const lifecycleChange = changes.find((change) => change.field === 'lifecycleState');
        const shouldReactivate = group.reactivationRequired && (!lifecycleChange || (decisions.get(lifecycleChange.resolutionKey) ?? lifecycleChange.decision) === 'APPLY_EXCEL');
        const hasDataChange = changes.some((change) => change.field !== 'lifecycleState' && (decisions.get(change.resolutionKey) ?? change.decision) === 'APPLY_EXCEL');
        for (const change of changes) await repository.saveDecision(change.resolutionKey,decisions.get(change.resolutionKey) ?? change.decision,actorEmail);
        let collaboratorId = person.collaboratorId;
        if (shouldReactivate || hasDataChange) {
          const input = await toInput(row,person,actorEmail,null,decisions,changes,undefined,payload.deliveryManagers?.[rowKey] ?? row.deliveryManager ?? person.deliveryManager);
          if (shouldReactivate) {
            collaboratorId = await repository.reactivate(person,input,actorEmail);
            result.reactivated += 1;
          } else if (person.collaboratorStatus === 'ACTIVE') {
            await repository.update(person,input,actorEmail);
            result.updated += 1;
          }
          if (collaboratorId) await certificationService.synchronize(collaboratorId,actorEmail);
        }
        await applyCertifications(row,person,person.personId);
      } catch (error) {
        result.skipped += 1;
        result.errors.push({ rowNumber:group.rowNumber,name:group.fullName,message:(error as Error).message });
      }
    }

    const today = new Date().toISOString().slice(0,10);
    for (const low of preview.possibleLows) {
      const decision = payload.lowDecisions?.[low.collaboratorId] ?? 'REVIEW';
      if (decision !== 'DEACTIVATE') continue;
      try {
        await lifecycleService.moveCollaboratorToTalent(low.collaboratorId,{ reasonCode:'UNASSIGNED',effectiveDate:today,talentStage:'UNASSIGNED',notes:'Movimiento generado desde la importación Excel de colaboradores.' },actorEmail);
        result.movedToTalentBank += 1;
      } catch (error) {
        result.errors.push({ rowNumber:null,name:low.fullName,message:(error as Error).message });
      }
    }
    return result;
  }
}
