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
  sameImportCertificationAttemptEvidence,
  sameEffectiveImportCertificationState,
  requiresManualCertificationReconciliation,
  manualProtectedCertificationOutcomeChanged,
  type ImportCertificationCatalogConfig,
  type ImportCertificationCurrentState,
  type ParsedCertificationEvidence,
} from './bbvaCollaboratorImportCertificationDomain.js';
import { PersonLifecycleService } from './bbvaPersonLifecycleService.js';
import { BbvaUserAdminService } from './bbvaUserAdminService.js';
import {
  buildImportIdentityIndex,
  prepareImportIdentityRows,
  resolveImportIdentity,
} from './bbvaCollaboratorImportIdentity.js';
import { splitMexicanFullName } from './bbvaMexicanName.js';

const repository = new CollaboratorImportRepository();
const certificationService = new CollaboratorCertificationService();
const certificationRepository = new CollaboratorCertificationRepository();
const lifecycleService = new PersonLifecycleService();
const userAdminService = new BbvaUserAdminService();

const HEADER_ALIASES = {
  fullName: ['NOMBRE EXTERNO', 'NOMBRE COMPLETO', 'COLABORADOR', 'NOMBRE', 'NAME'],
  softtekCode: ['IS', 'CODIGO SOFTTEK', 'CÓDIGO SOFTTEK'],
  corporateUser: ['XM', 'USUARIO CORPORATIVO', 'USUARIO BBVA'],
  email: ['CORREO SOFTTEK', 'CORREO', 'CORREO ELECTRONICO', 'CORREO ELECTRÓNICO', 'EMAIL', 'E-MAIL'],
  bbvaEmail: ['CORREO BBVA', 'CORREO CORPORATIVO'],
  deliveryManager: ['DM', 'DELIVERY MANAGER', 'DELIVERY MANAGER SOFTTEK'],
  profile: ['PERFIL'],
  technologyProfile: ['PERFIL TECNOLOGICO', 'PERFIL TECNOLÓGICO'],
  currentTechnology: ['TECNOLOGIA ACTUAL', 'TECNOLOGÍA ACTUAL'],
  expertise: ['EXPERTISE', 'SENIORITY'],
  startDate: ['FECHA DE ALTA', 'FECHA ALTA BBVA'],
  hireDate: ['FECHA ALTA -SAP', 'FECHA ALTA - SAP', 'FECHA ALTA –SAP', 'FECHA ALTA – SAP', 'FECHA ALTA SAP', 'FECHA CONTRATACION SOFTTEK', 'FECHA CONTRATACIÓN SOFTTEK'],
  resourceStatus: ['ESTATUS DEL RECURSO', 'ESTADO DEL RECURSO', 'STATUS SOFTTEK'],
  originalFullName: ['NOMBRE EXTERNO', 'NOMBRE COMPLETO', 'COLABORADOR', 'NOMBRE', 'NAME'],
  bbvaStructureLevel2: ['ESTRUCTURA NIVEL 2', 'ESTRUCTURA N2'],
  bbvaStructureLevel3: ['ESTRUCTURA NIVEL 3', 'ESTRUCTURA N3'],
  bbvaAccessEndDate: ['FECHA FIN DE ACCESOS', 'FECHA FIN ACCESOS'],
  bbvaAccessAuthorizer: ['NOMBRE AUTORIZADOR', 'AUTORIZADOR'],
  bbvaAccessStatus: ['STATUS ACCESOS', 'ESTATUS ACCESOS'],
} as const;

const CERTIFICATION_TECHNOLOGY_ALIASES = ['TECNOLOGIA EN LA QUE SE CERTIFICA', 'TECNOLOGÍA EN LA QUE SE CERTIFICA'] as const;
const CURRENT_TECHNOLOGY_EXPERTISE_PREFIXES = ['TECNOLOGIA EN LA QUE DESARROLLA ACTUALMENTE Y EXPERTIS'] as const;

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
  certificationTechnology: string | null;
  currentTechnology: string | null;
  expertise: string | null;
  startDate: string | null;
  hireDate: string | null;
  resourceStatus: string | null;
  originalFullName: string | null;
  bbvaStructureLevel2: string | null;
  bbvaStructureLevel3: string | null;
  bbvaAccessEndDate: string | null;
  bbvaAccessAuthorizer: string | null;
  bbvaAccessStatus: string | null;
  source: ImportSourceRow;
}

interface MatchResult {
  row: NormalizedRow;
  person: ImportPersonRecord | null;
  conflict: string | null;
  referencedPersonIds: string[];
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
  originalFullName: 'Nombre completo de origen',
  bbvaStructureLevel2: 'Estructura nivel 2',
  bbvaStructureLevel3: 'Estructura nivel 3',
  bbvaAccessEndDate: 'Fecha fin de accesos',
  bbvaAccessAuthorizer: 'Nombre autorizador',
  bbvaAccessStatus: 'Status accesos',
  lifecycleState: 'Estado operativo',
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+\[\d+\]$/, '')
    .trim()
    .toUpperCase();
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

function isPlaceholderValue(value: string | null): boolean {
  if (!value) return true;
  return ['#N/A', 'N/A', 'NA', 'TBD', 'NULL', 'SIN DATO', 'NO DISPONIBLE', '-'].includes(normalizeKey(value));
}

function valueByAliases(values: Record<string, string>, aliases: readonly string[]): string | null {
  // El orden de aliases representa prioridad funcional y no el orden físico de columnas.
  for (const alias of aliases) {
    const wanted = normalizeHeader(alias);
    for (const [header, value] of Object.entries(values)) {
      if (normalizeHeader(header) !== wanted) continue;
      const candidate = clean(value, 1000);
      if (candidate && !isPlaceholderValue(candidate)) return candidate;
    }
  }
  return null;
}

function valueByHeaderPrefix(values: Record<string, string>, prefixes: readonly string[]): string | null {
  const wanted = prefixes.map(normalizeHeader);
  for (const [header, value] of Object.entries(values)) {
    const normalized = normalizeHeader(header);
    if (!wanted.some((prefix) => normalized.startsWith(prefix))) continue;
    const candidate = clean(value, 1000);
    if (candidate && !isPlaceholderValue(candidate)) return candidate;
  }
  return null;
}

function parseCurrentTechnologyAndExpertise(value: string | null): { technology: string | null; expertise: string | null } {
  const candidate = clean(value, 240);
  if (!candidate) return { technology: null, expertise: null };
  const match = candidate.match(/^(.*?)[\s-]+(JR|STD|SR)\s*$/i);
  if (!match) return { technology: canonicalCatalog(candidate), expertise: null };
  return { technology: canonicalCatalog(match[1]), expertise: match[2].toUpperCase() };
}

export function resolveAuthoritativeImportDates(values: Record<string, string>): { startDate: string | null; hireDate: string | null } {
  return {
    startDate: normalizeDate(valueByAliases(values, HEADER_ALIASES.startDate)),
    hireDate: normalizeDate(valueByAliases(values, HEADER_ALIASES.hireDate)),
  };
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
  const rawAccessEndDate = valueByAliases(source.values, HEADER_ALIASES.bbvaAccessEndDate);
  const { startDate, hireDate } = resolveAuthoritativeImportDates(source.values);
  const bbvaAccessEndDate = normalizeDate(rawAccessEndDate);
  if (rawStartDate && !startDate) return { rowKey, rowNumber: source.rowNumber, fullName, message: `FECHA ALTA BBVA no tiene un formato válido: ${rawStartDate}.` };
  if (rawHireDate && !hireDate) return { rowKey, rowNumber: source.rowNumber, fullName, message: `FECHA DE CONTRATACIÓN SOFTTEK no tiene un formato válido: ${rawHireDate}.` };
  if (rawAccessEndDate && !bbvaAccessEndDate) return { rowKey, rowNumber: source.rowNumber, fullName, message: `FECHA FIN DE ACCESOS no tiene un formato válido: ${rawAccessEndDate}.` };

  const email = clean(valueByAliases(source.values, HEADER_ALIASES.email), 255)?.toLowerCase() ?? null;
  if (email && !isEmail(email)) return { rowKey, rowNumber: source.rowNumber, fullName, message: `El correo Softtek del Excel no tiene un formato válido: ${email}.` };
  const bbvaEmail = clean(valueByAliases(source.values, HEADER_ALIASES.bbvaEmail), 255)?.toLowerCase() ?? null;
  if (bbvaEmail && !isEmail(bbvaEmail)) return { rowKey, rowNumber: source.rowNumber, fullName, message: `El correo BBVA del Excel no tiene un formato válido: ${bbvaEmail}.` };
  const deliveryManager = clean(valueByAliases(source.values, HEADER_ALIASES.deliveryManager), 180);

  const softtekCode = upper(valueByAliases(source.values, HEADER_ALIASES.softtekCode), 80);
  const corporateUser = upper(valueByAliases(source.values, HEADER_ALIASES.corporateUser), 100);
  const actualTechnology = parseCurrentTechnologyAndExpertise(valueByHeaderPrefix(source.values, CURRENT_TECHNOLOGY_EXPERTISE_PREFIXES));
  const explicitCurrentTechnology = canonicalCatalog(valueByAliases(source.values, HEADER_ALIASES.currentTechnology));
  const explicitExpertise = upper(valueByAliases(source.values, HEADER_ALIASES.expertise), 40);
  const identitySeed = softtekCode
    ? `IS:${normalizeKey(softtekCode)}`
    : corporateUser
      ? `XM:${normalizeKey(corporateUser)}`
      : email
        ? `MAIL:${normalizeKey(email)}`
        : bbvaEmail
          ? `BBVA_MAIL:${normalizeKey(bbvaEmail)}`
          : `NAME:${normalizeKey(fullName)}`;
  const stableRowKey = hash(identitySeed);

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
    certificationTechnology: canonicalCatalog(valueByAliases(source.values, CERTIFICATION_TECHNOLOGY_ALIASES)),
    currentTechnology: explicitCurrentTechnology ?? actualTechnology.technology,
    expertise: explicitExpertise ?? actualTechnology.expertise,
    startDate,
    hireDate,
    resourceStatus: upper(valueByAliases(source.values, HEADER_ALIASES.resourceStatus), 80),
    originalFullName: clean(valueByAliases(source.values, HEADER_ALIASES.originalFullName), 300),
    bbvaStructureLevel2: clean(valueByAliases(source.values, HEADER_ALIASES.bbvaStructureLevel2), 220),
    bbvaStructureLevel3: clean(valueByAliases(source.values, HEADER_ALIASES.bbvaStructureLevel3), 220),
    bbvaAccessEndDate,
    bbvaAccessAuthorizer: clean(valueByAliases(source.values, HEADER_ALIASES.bbvaAccessAuthorizer), 220),
    bbvaAccessStatus: clean(valueByAliases(source.values, HEADER_ALIASES.bbvaAccessStatus), 100),
    source,
  };
}

function matchRows(rows: NormalizedRow[], people: ImportPersonRecord[]): MatchResult[] {
  const index = buildImportIdentityIndex(people);
  return rows.map((row) => {
    const match = resolveImportIdentity(row, index);
    return { row, person: match.person, conflict: match.conflict, referencedPersonIds: match.referencedPersonIds };
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
    decision: field === 'lifecycleState' || !currentValue ? 'APPLY_EXCEL' : 'KEEP_CURRENT',
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

async function resolveCatalogForInput(
  kind: 'profile' | 'technologyProfile' | 'technology',
  value: string | null,
  existingValue: string | null | undefined,
  existingId: string | null | undefined,
  actorEmail: string,
  seniority?: string | null,
) {
  if (!value) return null;
  const sameAsCurrent = Boolean(existingValue) && normalizeKey(existingValue) === normalizeKey(value);
  if (sameAsCurrent) {
    const currentCatalog = await repository.findCatalog(kind, value);
    if (currentCatalog) return currentCatalog;
    if (existingId) return { id: existingId, name: value, status: 'ACTIVE' as const, seniority: seniority ?? null };
  }
  return repository.ensureCatalog(kind, value, actorEmail, seniority);
}

async function toInput(row: NormalizedRow, existing: ImportPersonRecord | null, actorEmail: string, emailOverride?: string | null, decisions?: Map<string, ImportChangeDecision>, changes?: ImportFieldChange[], softtekCodeOverride?: string | null, deliveryManagerOverride?: string | null): Promise<ImportPersonInput> {
  const applyField = (field: ImportField, excel: string | null, current: string | null): string | null => {
    const change = changes?.find((item) => item.field === field);
    if (!change) return excel || current;
    return (decisions?.get(change.resolutionKey) ?? change.decision) === 'APPLY_EXCEL' ? excel : current;
  };

  const resolvedFullName = applyField('fullName', row.fullName, existing?.fullName ?? null) || row.fullName;
  const nameChange = changes?.find((item) => item.field === 'fullName');
  const incomingNameAccepted = !existing || (nameChange && (decisions?.get(nameChange.resolutionKey) ?? nameChange.decision) === 'APPLY_EXCEL');
  const parsedNames = splitMexicanFullName(resolvedFullName);
  const names = existing && !incomingNameAccepted
    ? { firstName: existing.firstName, lastName: existing.lastName }
    : parsedNames;
  const profile = canonicalCatalog(applyField('profile', row.profile, existing?.profile ?? null));
  const technologyProfile = canonicalCatalog(applyField('technologyProfile', row.technologyProfile, existing?.technologyProfile ?? null));
  const currentTechnology = canonicalCatalog(applyField('currentTechnology', row.currentTechnology, existing?.currentTechnology ?? null));
  const expertise = upper(applyField('expertise', row.expertise, existing?.expertise ?? null), 40) ?? inferSeniority(profile, row.expertise || existing?.expertise || null);

  const resolvedEmail = clean(emailOverride, 255)?.toLowerCase() || applyField('email', row.email, existing?.email ?? null) || '';
  if (!isEmail(resolvedEmail)) throw Object.assign(new Error(`Captura un correo válido para ${resolvedFullName}.`), { code: 'INVALID_EMAIL' });
  const requestedDeliveryManager = clean(deliveryManagerOverride, 180) || clean(applyField('deliveryManager', row.deliveryManager, existing?.deliveryManager ?? null), 180);
  if (!requestedDeliveryManager) throw Object.assign(new Error(`Selecciona un Delivery Manager para ${resolvedFullName}.`), { code: 'MISSING_DELIVERY_MANAGER' });
  const resolvedDeliveryManager = await userAdminService.resolveDeliveryManagerName(requestedDeliveryManager);

  const profileOption = await resolveCatalogForInput('profile', profile, existing?.profile, existing?.profileCatalogId, actorEmail, inferSeniority(profile, expertise));
  const technologyProfileOption = await resolveCatalogForInput('technologyProfile', technologyProfile, existing?.technologyProfile, existing?.technologyProfileCatalogId, actorEmail);
  const technologyOption = await resolveCatalogForInput('technology', currentTechnology, existing?.currentTechnology, existing?.currentTechnologyCatalogId, actorEmail);

  return {
    softtekCode: upper(softtekCodeOverride ?? applyField('softtekCode', row.softtekCode, existing?.softtekCode ?? null), 80),
    corporateUser: upper(applyField('corporateUser', row.corporateUser, existing?.corporateUser ?? null), 100),
    bbvaEmail: clean(applyField('bbvaEmail', row.bbvaEmail, existing?.bbvaEmail ?? null), 255)?.toLowerCase() ?? null,
    deliveryManager: resolvedDeliveryManager,
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
    originalFullName: applyField('originalFullName', row.originalFullName, existing?.originalFullName ?? null) || resolvedFullName,
    bbvaStructureLevel2: applyField('bbvaStructureLevel2', row.bbvaStructureLevel2, existing?.bbvaStructureLevel2 ?? null),
    bbvaStructureLevel3: applyField('bbvaStructureLevel3', row.bbvaStructureLevel3, existing?.bbvaStructureLevel3 ?? null),
    bbvaAccessEndDate: applyField('bbvaAccessEndDate', row.bbvaAccessEndDate, existing?.bbvaAccessEndDate ?? null),
    bbvaAccessAuthorizer: applyField('bbvaAccessAuthorizer', row.bbvaAccessAuthorizer, existing?.bbvaAccessAuthorizer ?? null),
    bbvaAccessStatus: applyField('bbvaAccessStatus', row.bbvaAccessStatus, existing?.bbvaAccessStatus ?? null),
    notes: existing?.notes ?? null,
  };
}


function provenanceForRow(row: NormalizedRow) {
  const sourceFor = (field: string, fallback: 'TABLERO' | 'HEADCOUNT' | 'IMPORT') =>
    normalizeKey(row.source.values[`__BFS_SOURCE_${field}`]) === 'HEADCOUNT' ? 'HEADCOUNT' as const : fallback;
  const field = (fieldName: string, sourceType: 'TABLERO' | 'HEADCOUNT' | 'IMPORT', value: string | null) => ({ fieldName, sourceType, value, rowNumber: row.rowNumber });
  return [
    field('OriginalFullName',sourceFor('fullName','TABLERO'),row.originalFullName),
    field('SofttekCode',sourceFor('softtekCode','HEADCOUNT'),row.softtekCode),
    field('BbvaUser',sourceFor('corporateUser','HEADCOUNT'),row.corporateUser),
    field('SofttekEmail',sourceFor('softtekEmail','HEADCOUNT'),row.email),
    field('BbvaEmail',sourceFor('bbvaEmail','HEADCOUNT'),row.bbvaEmail),
    field('DeliveryManager',sourceFor('deliveryManager','TABLERO'),row.deliveryManager),
    field('Profile',sourceFor('profile','TABLERO'),row.profile),
    field('TechnologyProfile','TABLERO',row.technologyProfile),
    field('CurrentTechnology','TABLERO',row.currentTechnology),
    field('Expertise','TABLERO',row.expertise),
    field('BbvaStartDate','TABLERO',row.startDate),
    field('SofttekHireDate',sourceFor('hireDate','HEADCOUNT'),row.hireDate),
    field('BbvaStructureLevel2','TABLERO',row.bbvaStructureLevel2),
    field('BbvaStructureLevel3','TABLERO',row.bbvaStructureLevel3),
    field('BbvaAccessEndDate','TABLERO',row.bbvaAccessEndDate),
    field('BbvaAccessAuthorizer','TABLERO',row.bbvaAccessAuthorizer),
    field('BbvaAccessStatus','TABLERO',row.bbvaAccessStatus),
  ];
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
): { config: ImportCertificationCatalogConfig | null; issue: string | null; inactive: boolean } {
  if (block !== 'TECHNOLOGICAL') {
    const name = catalogNameForBlock(block);
    const matches = catalog.filter((item) => normalizeKey(item.name) === normalizeKey(name));
    const active = matches.find((item) => item.status === 'ACTIVE') ?? null;
    if (active) return { config: active, issue: null, inactive: false };
    const inactive = matches.find((item) => item.status === 'INACTIVE') ?? null;
    if (inactive) return { config: inactive, issue: null, inactive: true };
    return { config: null, issue: `No existe una configuración de catálogo para ${certificationBlockLabel(block)}.`, inactive: false };
  }
  if (!row.certificationTechnology) return { config: null, issue: 'La fila no informa TECNOLOGÍA EN LA QUE SE CERTIFICA.', inactive: false };
  const allCandidates = catalog.filter((item) => item.certificationType === 'TECHNOLOGICAL' && normalizeKey(item.technologyName) === normalizeKey(row.certificationTechnology));
  const candidates = allCandidates.filter((item) => item.status === 'ACTIVE');
  if (!candidates.length && allCandidates.some((item) => item.status === 'INACTIVE')) {
    return { config: allCandidates.find((item) => item.status === 'INACTIVE') ?? null, issue: null, inactive: true };
  }
  if (!candidates.length) return { config: null, issue: `No existe una certificación tecnológica asociada a ${row.certificationTechnology}.`, inactive: false };
  if (candidates.length === 1) return { config: candidates[0], issue: null, inactive: false };

  const exact = candidates.filter((item) => normalizeKey(item.name) === normalizeKey(row.certificationTechnology));
  if (exact.length === 1) return { config: exact[0], issue: null, inactive: false };

  const activeCurrent = candidates.filter((candidate) => currentStates.some((state) => state.certificationId === candidate.id && state.applicable && state.baseStatus !== 'NOT_APPLICABLE'));
  if (activeCurrent.length === 1) return { config: activeCurrent[0], issue: null, inactive: false };

  const profileText = normalizeKey(`${row.profile ?? ''} ${row.technologyProfile ?? ''} ${person?.profile ?? ''}`);
  const profileMatches = candidates.filter((candidate) => {
    const candidateName = normalizeKey(candidate.name);
    const technology = normalizeKey(row.certificationTechnology);
    const discriminator = candidateName.replace(technology, '').trim();
    return discriminator.length >= 3 && profileText.includes(discriminator);
  });
  if (profileMatches.length === 1) return { config: profileMatches[0], issue: null, inactive: false };

  return { config: null, issue: `La tecnología ${row.certificationTechnology} tiene más de una certificación aplicable (${candidates.map((item) => item.name).join(', ')}) y el perfil no permite elegir una de forma inequívoca.`, inactive: false };
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
    { field:'softtekManagement' as const,label:'Gestión Softtek',currentValue:current?.softtekManagement ?? null,excelValue:evidence.softtekManagement,calculatedValue:evidence.softtekManagement,origin:current?.lastDataSource ?? current?.source ?? null },
  ];
}

function effectiveEvidenceChanged(current: ImportCertificationCurrentState | null, evidence: ParsedCertificationEvidence): boolean {
  return !sameEffectiveImportCertificationState(current, evidence) || normalizeKey(current?.softtekManagement) !== normalizeKey(evidence.softtekManagement);
}

function currentCertificationResolutionFingerprint(current: ImportCertificationCurrentState | null): string {
  if (!current) return hash('CERT_CURRENT', 'NONE');
  const attempts = [...current.attempts]
    .sort((a, b) => a.cycleNumber - b.cycleNumber || a.attemptNumber - b.attemptNumber)
    .map((attempt) => [attempt.cycleNumber, attempt.attemptNumber, attempt.applicationDate, attempt.result, attempt.score10, attempt.source].join(':'))
    .join(';');
  return hash(
    'CERT_CURRENT', current.certificationId, String(current.applicable), current.baseStatus, current.applicationDate,
    current.initialDueDate, formatNumber(current.lastScore10), formatNumber(current.importedAttemptNumber),
    current.lastDataSource, current.softtekManagement, attempts,
  );
}

const CERTIFICATION_DATA_ERROR_CODES = new Set([
  'INVALID_APPLICABILITY',
  'INVALID_APPLICATION_DATE',
  'INVALID_NORMATIVE_LIMIT',
  'INVALID_SCORE',
  'INVALID_ATTEMPT',
  'ATTEMPT_EXCEEDS_CONFIGURED_MAX',
  'INVALID_CATALOG_MAPPING',
  'APPROVED_WITHOUT_DATE',
  'FAILED_WITH_ATTEMPT_ZERO',
  'DATE_WITHOUT_STATUS',
  'SCORE_WITHOUT_DATE',
  'ATTEMPT_WITHOUT_EVIDENCE',
  'NOT_APPLICABLE_WITH_EVIDENCE',
  'NOT_APPLICABLE_WITH_STATUS',
]);

function isCertificationDataError(issue: { code: string; blocking: boolean }): boolean {
  return issue.blocking && CERTIFICATION_DATA_ERROR_CODES.has(issue.code);
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
    if (selected.inactive) {
      issues.push({ code: 'CATALOG_INACTIVE_SKIPPED', message: `${evidence.label} está inactiva en el catálogo y se conservará sin cambios.`, blocking: false });
    }
    const nonApplicableWithoutCatalog = !selected.config && evidence.applicable === false;
    if (selected.issue && !nonApplicableWithoutCatalog) {
      issues.push({ code: 'INVALID_CATALOG_MAPPING', message: selected.issue, blocking: true });
    }
    const hasChanges = selected.inactive
      ? false
      : selected.config
        ? effectiveEvidenceChanged(current, evidence)
        : issues.some((issue) => issue.blocking && issue.code !== 'INVALID_CATALOG_MAPPING');
    if (requiresManualCertificationReconciliation(current, manualProtectedCertificationOutcomeChanged(current, evidence), issues.some(isCertificationDataError))) {
      issues.push({ code:'MANUAL_HISTORY_DIFFERENCE', message:`${evidence.label} tiene resultados registrados manualmente y el Excel propone información diferente.`, blocking:true });
    }
    if (current && evidence.administrativeAttempt !== null && evidence.administrativeAttempt > 0 && evidence.applicationDate && evidence.baseStatus && ['APPROVED','FAILED'].includes(evidence.baseStatus)) {
      const occupiedAttempt = current.attempts.find((attempt) => attempt.cycleNumber === current.currentCycle && attempt.attemptNumber === evidence.administrativeAttempt);
      if (occupiedAttempt) {
        const expectedResult = evidence.baseStatus === 'APPROVED' ? 'APPROVED' : 'FAILED';
        const sameAttemptEvidence = sameImportCertificationAttemptEvidence(
          { applicationDate: occupiedAttempt.applicationDate, result: occupiedAttempt.result, score10: occupiedAttempt.score10 },
          { applicationDate: evidence.applicationDate, result: expectedResult, score10: evidence.score10 },
        );
        if (!sameAttemptEvidence) {
          issues.push({
            code:'ATTEMPT_SLOT_DIFFERENCE',
            message:`${evidence.label} intenta ocupar el intento ${evidence.administrativeAttempt}, pero ese intento ya existe con fecha, resultado o promedio diferentes (${occupiedAttempt.source ?? 'origen desconocido'}).`,
            blocking:true,
          });
        }
      }
    }
    const excelCalculated = rawStatusToCalculated(evidence.rawCertificationStatus);
    const ruleGap: string | null = null;
    if (excelCalculated && evidence.calculatedStatus && excelCalculated !== evidence.calculatedStatus && selected.config?.expiringSoonDays != null) {
      issues.push({ code:'EXCEL_STATUS_DIFFERS_FROM_CALCULATION', message:`${evidence.label}: el Excel informa ${evidence.rawCertificationStatus} y la configuración vigente determina ${evidence.calculatedStatus}.`, blocking:false });
    }

    const currentFingerprint = currentCertificationResolutionFingerprint(current);
    const rowIdentity = person?.personId ?? row.rowKey;
    const resolutionKey = importCertificationResolutionKey({ rowIdentity, block, issueCode:'RECONCILE', sourceFingerprint:evidence.fingerprint, calculatedStatus:evidence.calculatedStatus, currentFingerprint });
    const conflictKeys = issues.filter((issue) => issue.blocking && !isCertificationDataError(issue)).map((issue) => ({
      key: importCertificationResolutionKey({ rowIdentity, block, issueCode:issue.code, sourceFingerprint:evidence.fingerprint, calculatedStatus:evidence.calculatedStatus, currentFingerprint }),
      code: issue.code,
      message: issue.message,
    }));
    prepared.push({
      config:selected.inactive ? null : selected.config,
      evidence,
      conflictKeys,
      preview:{
        block,label:evidence.label,certificationId:selected.config?.id ?? null,certificationName:selected.config?.name ?? null,
        resolutionKey,sourceFingerprint:evidence.fingerprint,decision:'APPLY_EXCEL',resolvedPreviously:false,hasChanges,
        currentSource:current?.lastDataSource ?? current?.source ?? null,currentStatus:current?.calculatedStatus ?? null,
        excelStatus:evidence.rawCertificationStatus,calculatedStatus:evidence.calculatedStatus,ruleGap,
        fields:buildCertificationFields(current,evidence),
        issues:issues.map((issue) => ({
          ...issue,
          category:isCertificationDataError(issue) ? 'ERROR' : issue.blocking ? 'CONFLICT' : 'WARNING',
        })),
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

    const identityPreparation = prepareImportIdentityRows(rows);
    const effectiveRows = identityPreparation.rows;
    const duplicateRows = new Set<number>(identityPreparation.issues.filter((issue) => issue.blocking).map((issue) => issue.rowNumber));
    for (const issue of identityPreparation.issues) {
      errors.push({
        rowKey: issue.rowKey,
        rowNumber: issue.rowNumber,
        fullName: issue.fullName,
        code: issue.code,
        message: issue.message,
        severity: issue.blocking ? 'ERROR' : 'WARNING',
        scope: 'ROW',
      });
    }

    const [people, certificationCatalog, certificationStates] = await Promise.all([
      repository.listPeople(),
      certificationRepository.listImportCatalog(),
      certificationRepository.listImportStates(),
    ]);
    const matches = matchRows(effectiveRows, people);
    const newItems: ImportNewCandidate[] = [];
    const changedItems: ImportChangedCandidate[] = [];
    const conflicts: ImportPreviewResponse['conflicts'] = [];
    const matchedPersonIds = new Set<string>();
    const allChanges: Array<{ row: NormalizedRow; person: ImportPersonRecord; change: ImportFieldChange }> = [];
    const preparedByRow = new Map<string, PreparedCertification[]>();

    for (const match of matches) {
      // La presencia en el archivo se registra antes de cualquier validación posterior. Así una fila
      // reconocida pero conflictiva nunca convierte accidentalmente a la persona en una posible baja.
      for (const personId of match.referencedPersonIds) matchedPersonIds.add(personId);

      if (duplicateRows.has(match.row.rowNumber)) continue;
      if (match.conflict) {
        conflicts.push({ rowKey: match.row.rowKey, rowNumber: match.row.rowNumber, fullName: match.row.fullName, message: match.conflict, issueCode: 'IDENTITY_CONFLICT' });
        continue;
      }

      const rowCatalogActions = await catalogActions(match.row);
      const inactiveCatalogs = rowCatalogActions.filter((action) => {
        if (action.action !== 'INACTIVE') return false;
        if (!match.person) return true;
        const currentValue = action.type === 'profile'
          ? match.person.profile
          : action.type === 'technologyProfile'
            ? match.person.technologyProfile
            : match.person.currentTechnology;
        return normalizeKey(currentValue) !== normalizeKey(action.value);
      });
      if (inactiveCatalogs.length > 0) {
        const labels: Record<ImportCatalogAction['type'], string> = { profile: 'perfil', technologyProfile: 'perfil tecnológico', technology: 'tecnología' };
        for (const inactive of inactiveCatalogs) {
          errors.push({
            rowKey: match.row.rowKey,
            rowNumber: match.row.rowNumber,
            fullName: match.row.fullName,
            code: 'INACTIVE_CATALOG_VALUE',
            scope: 'ROW',
            message: `El ${labels[inactive.type]} “${inactive.value}” está inactivo. Selecciona un valor activo antes de continuar.`,
          });
        }
        continue;
      }

      const prepared = prepareCertifications(match.row, match.person, certificationCatalog, certificationStates);
      preparedByRow.set(match.row.rowKey, prepared);
      for (const cert of prepared) {
        for (const issue of cert.preview.issues.filter(isCertificationDataError)) {
          errors.push({
            rowKey: match.row.rowKey,
            rowNumber: match.row.rowNumber,
            fullName: match.row.fullName,
            message: issue.message,
            code: issue.code,
            scope: 'CERTIFICATION',
            certificationBlock: cert.preview.block,
            certificationLabel: cert.preview.label,
          });
        }
      }

      if (!match.person) {
        newItems.push({
          rowKey: match.row.rowKey,rowNumber: match.row.rowNumber,fullName: match.row.fullName,email: match.row.email,
          softtekCode: match.row.softtekCode,corporateUser: match.row.corporateUser,bbvaEmail: match.row.bbvaEmail,deliveryManager: match.row.deliveryManager,profile: match.row.profile,
          technologyProfile: match.row.technologyProfile,currentTechnology: match.row.currentTechnology,expertise: match.row.expertise,
          startDate: match.row.startDate,hireDate: match.row.hireDate,originalFullName:match.row.originalFullName,bbvaStructureLevel2:match.row.bbvaStructureLevel2,bbvaStructureLevel3:match.row.bbvaStructureLevel3,bbvaAccessEndDate:match.row.bbvaAccessEndDate,bbvaAccessAuthorizer:match.row.bbvaAccessAuthorizer,bbvaAccessStatus:match.row.bbvaAccessStatus,catalogActions: rowCatalogActions,certifications: prepared.map((item) => item.preview),
        });
        continue;
      }

      const fields: ImportField[] = ['fullName','softtekCode','corporateUser','email','bbvaEmail','deliveryManager','profile','technologyProfile','currentTechnology','expertise','startDate','hireDate','originalFullName','bbvaStructureLevel2','bbvaStructureLevel3','bbvaAccessEndDate','bbvaAccessAuthorizer','bbvaAccessStatus'];
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
        const previouslyResolved = cert.conflictKeys.length > 0 ? allConflictsResolved : Boolean(certDecision);
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
    }

    const explicitLows = new Set(matches.filter((item) => item.person && resourceIsLow(item.row.resourceStatus)).map((item) => item.person?.personId as string));
    const possibleLows: ImportPossibleLow[] = people
      .filter((person) => person.collaboratorStatus === 'ACTIVE' && (!matchedPersonIds.has(person.personId) || explicitLows.has(person.personId)))
      .map((person) => ({ collaboratorId:person.collaboratorId as string,personId:person.personId,fullName:person.fullName,email:person.email,profile:person.profile,currentTechnology:person.currentTechnology,decision:'REVIEW' }));

    const certPreviews = [...newItems.flatMap((item) => item.certifications), ...changedItems.flatMap((item) => item.certifications)];
    const visibleChangedItems = changedItems.filter((item) => item.changes.length > 0 || item.reactivationRequired || item.certifications.some((cert) => cert.hasChanges));
    const enrichedRowKeys = new Set(allChanges.filter((item) => !item.change.currentValue && Boolean(item.change.excelValue)).map((item) => item.row.rowKey));
    const bbvaFieldNames = new Set<ImportField>(['corporateUser','bbvaEmail','startDate','bbvaStructureLevel2','bbvaStructureLevel3','bbvaAccessEndDate','bbvaAccessAuthorizer','bbvaAccessStatus']);
    const softtekFieldNames = new Set<ImportField>(['softtekCode','email','hireDate']);
    const qualitySummary = {
      homologatedPeople: matches.filter((item) => Boolean(item.person) && !item.conflict).length,
      enrichedPeople: enrichedRowKeys.size,
      newDataFields: allChanges.filter((item) => !item.change.currentValue && Boolean(item.change.excelValue)).length,
      preservedExistingFields: allChanges.filter((item) => Boolean(item.change.currentValue) && item.change.decision === 'KEEP_CURRENT').length,
      differences: allChanges.length,
      identityConflicts: conflicts.filter((item) => item.issueCode === 'IDENTITY_CONFLICT').length,
      bbvaFieldsAdded: allChanges.filter((item) => !item.change.currentValue && bbvaFieldNames.has(item.change.field as ImportField)).length,
      softtekFieldsAdded: allChanges.filter((item) => !item.change.currentValue && softtekFieldNames.has(item.change.field as ImportField)).length,
    };
    return {
      totalRowsAnalyzed:rows.length,ignoredRows:Math.max(0,inputRows.length-rows.length),newItems,
      changedItems:visibleChangedItems,
      possibleLows,conflicts,errors,resolvedPreviously,
      certificationChanges:certPreviews.filter((item) => item.hasChanges && !item.issues.some(isCertificationDataError)).length,
      certificationResults:certPreviews.filter((item) => {
        const exam = item.fields.find((field) => field.field === 'examStatus');
        return item.hasChanges && !item.issues.some(isCertificationDataError) && Boolean(exam?.excelValue) && ['APPROVED','FAILED'].includes(exam?.calculatedValue ?? '');
      }).length,
      certificationRuleGaps:[...new Set(certPreviews.map((item) => item.ruleGap).filter((item): item is string => Boolean(item)))],
      qualitySummary,
    };
  }

  async apply(payload: ImportApplyRequest, actorEmail: string): Promise<ImportApplyResult> {
    const preview = await this.preview({ rows: payload.rows });
    const normalized = payload.rows
      .map((source) => normalizeRow(source))
      .filter((row): row is NormalizedRow => !('message' in row));
    const preparedIdentityRows = prepareImportIdentityRows(normalized).rows;
    const normalizedRows = new Map<string, NormalizedRow>(preparedIdentityRows.map((row) => [row.rowKey, row]));
    const people = await repository.listPeople();
    const peopleById = new Map(people.map((person) => [person.personId, person]));
    const changesByRow = collectAllChanges(preview);
    const decisions = new Map<string, ImportChangeDecision>();
    for (const changes of changesByRow.values()) for (const change of changes) decisions.set(change.resolutionKey,payload.decisions?.[change.resolutionKey] ?? change.decision);

    const rowConflictRows = new Set<string>();
    for (const conflict of preview.conflicts) {
      if (conflict.resolutionKey && payload.decisions?.[conflict.resolutionKey]) {
        decisions.set(conflict.resolutionKey, payload.decisions[conflict.resolutionKey]);
      }
      if (!conflict.certificationBlock && (!conflict.resolutionKey || !payload.decisions?.[conflict.resolutionKey])) {
        rowConflictRows.add(conflict.rowKey);
      }
    }
    const rowErrorRows = new Set(preview.errors.filter((item) => item.scope !== 'CERTIFICATION' && item.severity !== 'WARNING').map((item) => item.rowKey));
    const blockedRows = new Set([...rowConflictRows, ...rowErrorRows]);
    const result: ImportApplyResult = {
      created:0,updated:0,reactivated:0,movedToTalentBank:0,skipped:blockedRows.size,certificationUpdated:0,resultsRegistered:0,
      reusedDecisions:preview.resolvedPreviously.length,errors:[],
    };

    const [certificationCatalog, certificationStates] = await Promise.all([certificationRepository.listImportCatalog(),certificationRepository.listImportStates()]);

    const errorCode = (error: unknown): string | undefined => {
      if (!error || typeof error !== 'object') return undefined;
      const code = (error as { code?: unknown }).code;
      return typeof code === 'string' && code.trim() ? code : undefined;
    };

    const safeApplyErrorMessage = (error: unknown, fallback: string): string => {
      if (!error || typeof error !== 'object') return fallback;
      const candidate = error as { message?: unknown; statusCode?: unknown; number?: unknown; code?: unknown };
      const message = typeof candidate.message === 'string' ? candidate.message.trim() : '';
      const statusCode = typeof candidate.statusCode === 'number' ? candidate.statusCode : null;
      const number = typeof candidate.number === 'number' ? candidate.number : null;
      const code = typeof candidate.code === 'string' ? candidate.code.toUpperCase() : '';
      if (number === 2601 || number === 2627 || /DUPLICATE KEY|UNIQUE (?:KEY|INDEX)|VIOLATION OF UNIQUE/i.test(message)) {
        return 'Existe otro colaborador con uno de los identificadores únicos informados (IS, Usuario BBVA o correo). Vuelve a validar el archivo.';
      }
      if (number === 547 || /FOREIGN KEY|REFERENCE CONSTRAINT/i.test(message)) {
        return 'La operación entra en conflicto con información relacionada existente. Vuelve a validar el registro antes de aplicarlo.';
      }
      if (statusCode !== null && statusCode >= 400 && statusCode < 500 && message) return message;
      if (code && !['EREQUEST','ESOCKET','ECONNCLOSED','ETIMEOUT','ELOGIN'].includes(code) && message) return message;
      if (message && !/\b(SELECT|INSERT|UPDATE|DELETE|MERGE|CONSTRAINT|SQL|REQUESTERROR|INVALID COLUMN)\b/i.test(message)) return message;
      return fallback;
    };

    const decisionPersistenceErrors = new Set<string>();
    const saveDecisionSafely = async (
      resolutionKey: string,
      decision: ImportChangeDecision,
      rowKey: string,
      rowNumber: number,
      fullName: string,
      context: string,
    ): Promise<void> => {
      try {
        await repository.saveDecision(resolutionKey, decision, actorEmail);
      } catch (error) {
        const reportKey = `${rowKey}:${context}`;
        if (decisionPersistenceErrors.has(reportKey)) return;
        decisionPersistenceErrors.add(reportKey);
        result.errors.push({
          rowKey,
          rowNumber,
          name: fullName,
          stage: 'UNKNOWN',
          code: errorCode(error),
          message: `No fue posible guardar la decisión de ${context}. Revísala nuevamente.`,
        });
      }
    };

    const applyCertifications = async (
      row: NormalizedRow,
      person: ImportPersonRecord | null,
      personId: string,
      rowNumber: number,
      fullName: string,
    ) => {
      let prepared: PreparedCertification[];
      try {
        prepared = prepareCertifications(row, person, certificationCatalog, certificationStates);
      } catch (error) {
        result.errors.push({
          rowKey: row.rowKey,
          rowNumber,
          name: fullName,
          stage: 'CERTIFICATION',
          code: errorCode(error),
          message: safeApplyErrorMessage(error, 'No fue posible preparar la reconciliación de certificaciones para este registro.'),
        });
        return;
      }
      for (const cert of prepared) {
        if (!cert.preview.hasChanges || cert.preview.issues.some(isCertificationDataError)) continue;

        let storedCertDecisions: Map<string, ImportChangeDecision>;
        try {
          storedCertDecisions = await repository.getStoredDecisions([
            cert.preview.resolutionKey,
            ...cert.conflictKeys.map((conflict) => conflict.key),
          ]);
        } catch (error) {
          result.errors.push({
            rowKey: row.rowKey,
            rowNumber,
            name: fullName,
            stage: 'CERTIFICATION',
            code: errorCode(error),
            message: `${cert.preview.label}: ${safeApplyErrorMessage(error, 'No fue posible consultar las decisiones previas de reconciliación.')}`,
          });
          continue;
        }

        const certDecision = payload.decisions?.[cert.preview.resolutionKey]
          ?? storedCertDecisions.get(cert.preview.resolutionKey)
          ?? cert.preview.decision;
        const blocking = cert.conflictKeys;
        const conflictDecision = (key: string): ImportChangeDecision | undefined => payload.decisions?.[key] ?? storedCertDecisions.get(key);
        const unresolvedConflict = blocking.some((conflict) => !conflictDecision(conflict.key));
        if (unresolvedConflict) continue;

        const keepBecauseConflict = blocking.some((conflict) => conflictDecision(conflict.key) === 'KEEP_CURRENT');
        if (certDecision === 'KEEP_CURRENT' || keepBecauseConflict) {
          for (const conflict of blocking) {
            const chosen = conflictDecision(conflict.key);
            if (chosen) await saveDecisionSafely(conflict.key, chosen, row.rowKey, rowNumber, fullName, cert.preview.label);
          }
          await saveDecisionSafely(cert.preview.resolutionKey, 'KEEP_CURRENT', row.rowKey, rowNumber, fullName, cert.preview.label);
          continue;
        }
        if (!cert.config) continue;

        let applied: { changed: boolean; resultRegistered: boolean };
        try {
          applied = await certificationRepository.applyImportedEvidence({ personId,config:cert.config,block:cert.preview.block,evidence:cert.evidence,actorEmail });
        } catch (error) {
          result.errors.push({
            rowKey: row.rowKey,
            rowNumber,
            name: fullName,
            stage: 'CERTIFICATION',
            code: errorCode(error),
            message: `${cert.preview.label}: ${safeApplyErrorMessage(error, 'No fue posible aplicar la evidencia de certificación para este registro.')}`,
          });
          continue;
        }

        if (applied.changed) result.certificationUpdated += 1;
        if (applied.resultRegistered) result.resultsRegistered += 1;
        for (const conflict of blocking) {
          const chosen = conflictDecision(conflict.key);
          if (chosen) await saveDecisionSafely(conflict.key, chosen, row.rowKey, rowNumber, fullName, cert.preview.label);
        }
        await saveDecisionSafely(cert.preview.resolutionKey, 'APPLY_EXCEL', row.rowKey, rowNumber, fullName, cert.preview.label);
      }
    };

    const reservedIdentities = {
      softtekCode: new Map<string, string>(),
      corporateUser: new Map<string, string>(),
      email: new Map<string, string>(),
      bbvaEmail: new Map<string, string>(),
    };
    const reserve = (map: Map<string, string>, value: string | null | undefined, owner: string) => {
      const key = normalizeKey(value);
      if (key) map.set(key, owner);
    };
    for (const person of people) {
      reserve(reservedIdentities.softtekCode, person.softtekCode, person.fullName);
      reserve(reservedIdentities.corporateUser, person.corporateUser, person.fullName);
      reserve(reservedIdentities.email, person.email, person.fullName);
      reserve(reservedIdentities.bbvaEmail, person.bbvaEmail, person.fullName);
    }
    const assertAvailable = (map: Map<string, string>, value: string | null | undefined, label: string) => {
      const key = normalizeKey(value);
      if (!key) return;
      const owner = map.get(key);
      if (owner) throw Object.assign(new Error(`${label} ${value} ya pertenece a ${owner}. Vuelve a validar el Excel antes de crear otro colaborador.`), { code: 'DUPLICATE_IDENTITY' });
    };

    for (const item of preview.newItems) {
      const row = normalizedRows.get(item.rowKey);
      if (!row || blockedRows.has(item.rowKey)) continue;

      let created: { collaboratorId: string; personId: string } | null = null;
      try {
        const requestedIs = upper(payload.softtekCodes?.[item.rowKey] ?? item.softtekCode, 80);
        const requestedEmail = clean(payload.emails?.[item.rowKey] ?? item.email, 255)?.toLowerCase() ?? null;
        const requestedDm = clean(payload.deliveryManagers?.[item.rowKey] ?? item.deliveryManager, 180);
        if (!requestedIs) throw Object.assign(new Error(`Captura un IS válido para ${item.fullName}.`), { code: 'MISSING_SOFTTEK_CODE' });
        if (!requestedEmail || !isEmail(requestedEmail)) throw Object.assign(new Error(`Captura un correo válido para ${item.fullName}.`), { code: 'INVALID_EMAIL' });
        if (!requestedDm) throw Object.assign(new Error(`DM es obligatorio para ${item.fullName}.`), { code: 'MISSING_DELIVERY_MANAGER' });

        assertAvailable(reservedIdentities.softtekCode, requestedIs, 'El IS');
        assertAvailable(reservedIdentities.email, requestedEmail, 'El correo Softtek');
        assertAvailable(reservedIdentities.corporateUser, row.corporateUser, 'El Usuario BBVA');
        assertAvailable(reservedIdentities.bbvaEmail, row.bbvaEmail, 'El correo BBVA');

        const input = await toInput(row,null,actorEmail,requestedEmail,undefined,undefined,requestedIs,requestedDm);
        created = await repository.create(input,actorEmail);
        await repository.recordImportProvenance(created.personId, provenanceForRow(row), actorEmail);
        result.created += 1;
        reserve(reservedIdentities.softtekCode, input.softtekCode, item.fullName);
        reserve(reservedIdentities.email, input.email, item.fullName);
        reserve(reservedIdentities.corporateUser, input.corporateUser, item.fullName);
        reserve(reservedIdentities.bbvaEmail, input.bbvaEmail, item.fullName);
      } catch (error) {
        result.skipped += 1;
        result.errors.push({
          rowKey:item.rowKey,rowNumber:item.rowNumber,name:item.fullName,
          stage: errorCode(error)?.startsWith('MISSING_') || errorCode(error) === 'INVALID_EMAIL' || errorCode(error) === 'DUPLICATE_IDENTITY' ? 'VALIDATION' : 'CORE',
          code:errorCode(error),message:safeApplyErrorMessage(error, `No fue posible crear a ${item.fullName}.`),
        });
        continue;
      }

      try {
        await certificationService.synchronize(created.collaboratorId,actorEmail);
      } catch (error) {
        result.errors.push({
          rowKey:item.rowKey,rowNumber:item.rowNumber,name:item.fullName,stage:'CERTIFICATION',code:errorCode(error),
          message:`El colaborador se creó, pero no fue posible sincronizar sus certificaciones: ${safeApplyErrorMessage(error, 'error interno de sincronización')}`,
        });
      }
      await applyCertifications(row,null,created.personId,item.rowNumber,item.fullName);
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
      if (!row || !person || blockedRows.has(rowKey)) continue;

      const changes = changesByRow.get(rowKey) ?? [];
      for (const change of changes) decisions.set(change.resolutionKey,payload.decisions?.[change.resolutionKey] ?? change.decision);
      const lifecycleChange = changes.find((change) => change.field === 'lifecycleState');
      const shouldReactivate = group.reactivationRequired && (!lifecycleChange || (decisions.get(lifecycleChange.resolutionKey) ?? lifecycleChange.decision) === 'APPLY_EXCEL');
      const hasDataChange = changes.some((change) => change.field !== 'lifecycleState' && (decisions.get(change.resolutionKey) ?? change.decision) === 'APPLY_EXCEL');
      let collaboratorId = person.collaboratorId;
      let coreSucceeded = true;

      if (shouldReactivate || hasDataChange) {
        try {
          const input = await toInput(row,person,actorEmail,null,decisions,changes,undefined,payload.deliveryManagers?.[rowKey] ?? row.deliveryManager ?? person.deliveryManager);
          if (shouldReactivate) {
            collaboratorId = await repository.reactivate(person,input,actorEmail);
            result.reactivated += 1;
          } else if (person.collaboratorStatus === 'ACTIVE') {
            await repository.update(person,input,actorEmail);
            result.updated += 1;
          }
          await repository.recordImportProvenance(person.personId, provenanceForRow(row), actorEmail);
        } catch (error) {
          coreSucceeded = false;
          result.skipped += 1;
          result.errors.push({ rowKey,rowNumber:group.rowNumber,name:group.fullName,stage:'CORE',code:errorCode(error),message:safeApplyErrorMessage(error, `No fue posible actualizar a ${group.fullName}.`) });
        }
      }

      if (!coreSucceeded) continue;
      for (const change of changes) {
        await saveDecisionSafely(
          change.resolutionKey,
          decisions.get(change.resolutionKey) ?? change.decision,
          rowKey,
          group.rowNumber,
          group.fullName,
          `campo ${change.label}`,
        );
      }

      if ((shouldReactivate || hasDataChange) && collaboratorId) {
        try {
          await certificationService.synchronize(collaboratorId,actorEmail);
        } catch (error) {
          result.errors.push({
            rowKey,rowNumber:group.rowNumber,name:group.fullName,stage:'CERTIFICATION',code:errorCode(error),
            message:`Los datos generales se guardaron, pero no fue posible sincronizar las certificaciones: ${safeApplyErrorMessage(error, 'error interno de sincronización')}`,
          });
        }
      }
      await applyCertifications(row,person,person.personId,group.rowNumber,group.fullName);
    }

    const today = new Date().toISOString().slice(0,10);
    for (const low of preview.possibleLows) {
      const decision = payload.lowDecisions?.[low.collaboratorId] ?? 'REVIEW';
      if (decision !== 'DEACTIVATE') continue;
      try {
        await lifecycleService.moveCollaboratorToTalent(low.collaboratorId,{ reasonCode:'UNASSIGNED',effectiveDate:today,talentStage:'UNASSIGNED',notes:'Movimiento generado desde la importación Excel de colaboradores.' },actorEmail);
        result.movedToTalentBank += 1;
      } catch (error) {
        result.errors.push({ rowNumber:null,name:low.fullName,stage:'LIFECYCLE',code:errorCode(error),message:safeApplyErrorMessage(error, `No fue posible mover a ${low.fullName} al Banco de talento.`) });
      }
    }
    return result;
  }
}
