import { createHash } from 'node:crypto';
import type { ImportSourceRow } from './bbvaCollaboratorImportDomain.js';

export const IMPORT_CERTIFICATION_BLOCKS = [
  'DEVELOPMENT_SECURITY',
  'TECHNOLOGICAL',
  'ONE',
  'NORMATIVE_TESTING',
  'AGILE',
  'JIRA',
  'GITHUB',
] as const;
export type ImportCertificationBlock = (typeof IMPORT_CERTIFICATION_BLOCKS)[number];

export type ImportCertificationBaseStatus = 'PENDING' | 'FAILED' | 'APPROVED' | 'NOT_APPLICABLE';
export type ImportCertificationCalculatedStatus =
  | 'PENDING'
  | 'FAILED'
  | 'VALID'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'RECERTIFICATION_PENDING'
  | 'NOT_APPLICABLE';

export interface ImportCertificationCatalogConfig {
  id: string;
  name: string;
  certificationType: string;
  technologyName: string | null;
  validityMonths: number | null;
  initialCompletionDays: number | null;
  expiringSoonDays: number | null;
  recertificationEnabled: boolean;
  requiresAttempts: boolean;
  requiresApplicationDate: boolean;
}

export interface ImportCertificationCurrentState {
  recordId: string;
  certificationId: string;
  certificationName: string;
  certificationType: string;
  technologyName: string | null;
  source: 'AUTO' | 'MANUAL';
  applicable: boolean;
  baseStatus: string;
  calculatedStatus: string;
  currentCycle: number;
  applicationDate: string | null;
  approvedDate: string | null;
  expirationDate: string | null;
  initialDueDate: string | null;
  importedCertificationStatus: string | null;
  importedExamStatus: string | null;
  lastScore10: number | null;
  importedAttemptNumber: number | null;
  lastDataSource: string | null;
  lastImportFingerprint: string | null;
  attempts: Array<{
    id: string;
    cycleNumber: number;
    attemptNumber: number;
    applicationDate: string | null;
    result: string;
    score10: number | null;
    source: string | null;
    importFingerprint: string | null;
  }>;
}

export interface ImportCertificationIssue {
  code: string;
  message: string;
  blocking: boolean;
}

export interface ParsedCertificationEvidence {
  block: ImportCertificationBlock;
  label: string;
  applicable: boolean | null;
  rawApplicable: string | null;
  rawCertificationStatus: string | null;
  rawExamStatus: string | null;
  applicationDate: string | null;
  score10: number | null;
  administrativeAttempt: number | null;
  normativeLimitDate: string | null;
  baseStatus: ImportCertificationBaseStatus | null;
  initialDueDate: string | null;
  approvedDate: string | null;
  expirationDate: string | null;
  calculatedStatus: ImportCertificationCalculatedStatus | null;
  lifecycle: 'INITIAL' | 'RECERTIFICATION' | 'NOT_APPLICABLE' | 'STATUS_ONLY' | null;
  issues: ImportCertificationIssue[];
  fingerprint: string;
}

const BLOCK_LABELS: Record<ImportCertificationBlock, string> = {
  DEVELOPMENT_SECURITY: 'Desarrollo Seguro',
  TECHNOLOGICAL: 'Certificación tecnológica',
  ONE: 'ONE',
  NORMATIVE_TESTING: 'Normativa & Testing',
  AGILE: 'Agile',
  JIRA: 'JIRA',
  GITHUB: 'GitHub',
};

const HEADERS: Record<ImportCertificationBlock, {
  applicable: string[];
  status: string[];
  exam?: string[];
  date?: string[];
  score?: string[];
  attempt?: string[];
  limitDate?: string[];
}> = {
  DEVELOPMENT_SECURITY: {
    applicable: ['¿APLICA DS?', 'APLICA DS?'],
    status: ['ESTATUS CERTIFICACIÓN DS', 'ESTATUS CERTIFICACION DS'],
    exam: ['ESTATUS DEL EXAMEN DS'],
    date: ['FECHA DE APLICACIÓN DS', 'FECHA DE APLICACION DS'],
    score: ['PROMEDIO DS'],
    attempt: ['INTENTO DS'],
  },
  TECHNOLOGICAL: {
    applicable: ['¿APLICA TECNOLOGICA?', 'APLICA TECNOLOGICA?', '¿APLICA TECNOLÓGICA?'],
    status: ['ESTATUS CERTIFICACIÓN', 'ESTATUS CERTIFICACION'],
    exam: ['ESTATUS DEL EXAMEN'],
    date: ['FECHA DE APLICACIÓN TEC', 'FECHA DE APLICACION TEC'],
    score: ['PROMEDIO'],
    attempt: ['INTENTO'],
  },
  ONE: {
    applicable: ['¿APLICA ONE?', 'APLICA ONE?'],
    status: ['ESTATUS CERTIFICACIÓN ONE', 'ESTATUS CERTIFICACION ONE'],
  },
  NORMATIVE_TESTING: {
    applicable: ['¿APLICA NORMATIVA?', 'APLICA NORMATIVA?'],
    status: ['ESTATUS CERTIFICACIÓN NORMATIVA', 'ESTATUS CERTIFICACION NORMATIVA'],
    exam: ['ESTATUS DEL EXAMEN NORMATIVA'],
    date: ['FECHA DE APLICACIÓN NORMATIVA', 'FECHA DE APLICACION NORMATIVA'],
    score: ['PROMEDIO NORMATIVA'],
    attempt: ['INTENTO NORMATIVA'],
    limitDate: ['LIMITE PARA NORMATIVA', 'LÍMITE PARA NORMATIVA'],
  },
  AGILE: {
    applicable: ['¿APLICA AGILE?', 'APLICA AGILE?'],
    status: ['ESTATUS CERTIFICACIÓN AGILE', 'ESTATUS CERTIFICACION AGILE'],
  },
  JIRA: {
    applicable: ['APLICA JIRA'],
    status: ['ESTATUS DE VALORACIÓN JIRA', 'ESTATUS DE VALORACION JIRA'],
  },
  GITHUB: {
    applicable: ['APLICA GITHUB'],
    status: ['STATUS GITHUB', 'ESTATUS GITHUB'],
  },
};

function normalizeKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+\[\d+\]$/, '')
    .trim()
    .toUpperCase();
}

function clean(value: unknown, maxLength = 180): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, maxLength) : null;
}

function valueByAliases(values: Record<string, string>, aliases: string[] | undefined): string | null {
  if (!aliases?.length) return null;
  const candidates = new Set(aliases.map(normalizeKey));
  for (const [header, value] of Object.entries(values)) {
    if (!candidates.has(normalizeKey(header))) continue;
    const candidate = clean(value, 1000);
    if (candidate) return candidate;
  }
  return null;
}

export function normalizeImportDate(value: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    const date = new Date(`${candidate}T00:00:00Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== candidate ? null : candidate;
  }
  const match = candidate.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso;
}

export function addCalendarMonths(dateIso: string, months: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

export function addCalendarDays(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function parseApplicability(raw: string | null, block: ImportCertificationBlock): boolean | null {
  const value = normalizeKey(raw);
  if (!value) return null;
  if (['SI', 'SÍ', 'YES', 'APLICA'].includes(value)) return true;
  if (['NO', 'NO APLICA', 'N/A', 'NA'].includes(value)) return false;
  if (block === 'AGILE' && value === 'NO AGILE') return false;
  return null;
}

function parseScore(raw: string | null): { value: number | null; invalid: boolean } {
  if (!raw) return { value: null, invalid: false };
  const normalized = raw.replace(',', '.').trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return { value: null, invalid: true };
  const value = Number(normalized);
  return { value: Number.isFinite(value) && value >= 0 && value <= 10 ? value : null, invalid: !Number.isFinite(value) || value < 0 || value > 10 };
}

function parseAttempt(raw: string | null): { value: number | null; invalid: boolean } {
  if (!raw) return { value: null, invalid: false };
  if (!/^\d+$/.test(raw.trim())) return { value: null, invalid: true };
  const value = Number(raw);
  return { value: Number.isSafeInteger(value) && value >= 0 ? value : null, invalid: !Number.isSafeInteger(value) || value < 0 };
}

function hash(parts: unknown[]): string {
  return createHash('sha256').update(parts.map((part) => String(part ?? '')).join('|')).digest('hex');
}

function inferSimpleBaseStatus(block: ImportCertificationBlock, applicable: boolean | null, status: string | null, exam: string | null): ImportCertificationBaseStatus | null {
  if (applicable === false) return 'NOT_APPLICABLE';
  const examKey = normalizeKey(exam);
  const statusKey = normalizeKey(status);
  if (examKey === 'APROBADO' || examKey === 'APROBADA') return 'APPROVED';
  if (['REPROBADO', 'REPROBADA', 'NO APROBADO', 'NO APROBADA'].includes(examKey)) return 'FAILED';
  if (block === 'ONE' || block === 'GITHUB') {
    if (['APROBADO', 'APROBADA', 'SI'].includes(statusKey)) return 'APPROVED';
  }
  if (block === 'AGILE') {
    if (statusKey === 'SI') return 'APPROVED';
  }
  if (block === 'JIRA') {
    if (statusKey === 'FORMADO') return 'APPROVED';
    if (statusKey === 'PENDIENTE DE FORMACION') return 'PENDING';
  }
  if (statusKey === 'NO APLICA') return 'NOT_APPLICABLE';
  if (statusKey.startsWith('VIGENTE')) return 'APPROVED';
  if (statusKey.startsWith('SIN PRESENTAR') || statusKey === 'PENDIENTE' || statusKey === 'SIN EXAMEN') return 'PENDING';
  if (statusKey === 'VENCIDO' || statusKey === 'VENCIDA') return 'APPROVED';
  if (!statusKey && applicable === true) return 'PENDING';
  return null;
}

function calculateStatus(
  baseStatus: ImportCertificationBaseStatus | null,
  expirationDate: string | null,
  config: ImportCertificationCatalogConfig | null,
  todayIso: string,
): ImportCertificationCalculatedStatus | null {
  if (!baseStatus) return null;
  if (baseStatus === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  if (baseStatus === 'FAILED') return 'FAILED';
  if (baseStatus !== 'APPROVED') return 'PENDING';
  if (!expirationDate) return 'VALID';
  if (expirationDate < todayIso) return config?.recertificationEnabled ? 'RECERTIFICATION_PENDING' : 'EXPIRED';
  if (config?.expiringSoonDays) {
    const today = new Date(`${todayIso}T00:00:00Z`);
    today.setUTCDate(today.getUTCDate() + config.expiringSoonDays);
    if (expirationDate <= today.toISOString().slice(0, 10)) return 'EXPIRING';
  }
  return 'VALID';
}

function statusOnlyBlock(block: ImportCertificationBlock): boolean {
  return ['ONE', 'AGILE', 'JIRA', 'GITHUB'].includes(block);
}

export function parseCertificationEvidence(args: {
  source: ImportSourceRow;
  block: ImportCertificationBlock;
  startDate: string | null;
  config: ImportCertificationCatalogConfig | null;
  hadPreviousApproval: boolean;
  todayIso?: string;
}): ParsedCertificationEvidence | null {
  const { source, block, startDate, config, hadPreviousApproval } = args;
  const headers = HEADERS[block];
  const rawApplicable = valueByAliases(source.values, headers.applicable);
  const rawCertificationStatus = valueByAliases(source.values, headers.status);
  const rawExamStatus = valueByAliases(source.values, headers.exam);
  const rawDate = valueByAliases(source.values, headers.date);
  const rawScore = valueByAliases(source.values, headers.score);
  const rawAttempt = valueByAliases(source.values, headers.attempt);
  const rawLimitDate = valueByAliases(source.values, headers.limitDate);

  if (![rawApplicable, rawCertificationStatus, rawExamStatus, rawDate, rawScore, rawAttempt, rawLimitDate].some(Boolean)) return null;

  const issues: ImportCertificationIssue[] = [];
  const applicable = parseApplicability(rawApplicable, block);
  if (rawApplicable && applicable === null) issues.push({ code: 'INVALID_APPLICABILITY', message: `${BLOCK_LABELS[block]} contiene una aplicabilidad no reconocida: ${rawApplicable}.`, blocking: true });

  const applicationDate = normalizeImportDate(rawDate);
  if (rawDate && !applicationDate) issues.push({ code: 'INVALID_APPLICATION_DATE', message: `${BLOCK_LABELS[block]} contiene una fecha de aplicación inválida: ${rawDate}.`, blocking: true });
  const normativeLimitDate = normalizeImportDate(rawLimitDate);
  if (rawLimitDate && !normativeLimitDate) issues.push({ code: 'INVALID_NORMATIVE_LIMIT', message: `LIMITE PARA NORMATIVA contiene una fecha inválida: ${rawLimitDate}.`, blocking: true });

  const score = parseScore(rawScore);
  if (score.invalid) issues.push({ code: 'INVALID_SCORE', message: `${BLOCK_LABELS[block]} contiene un promedio fuera de la escala 0–10 o con formato inválido: ${rawScore}.`, blocking: true });
  const attempt = parseAttempt(rawAttempt);
  if (attempt.invalid) issues.push({ code: 'INVALID_ATTEMPT', message: `${BLOCK_LABELS[block]} contiene un intento inválido: ${rawAttempt}.`, blocking: true });

  const baseStatus = inferSimpleBaseStatus(block, applicable, rawCertificationStatus, rawExamStatus);
  const examKey = normalizeKey(rawExamStatus);
  const statusKey = normalizeKey(rawCertificationStatus);

  if (baseStatus === 'APPROVED' && config?.requiresApplicationDate && !applicationDate) {
    issues.push({ code: 'APPROVED_WITHOUT_DATE', message: `${BLOCK_LABELS[block]} está aprobada/vigente pero no tiene fecha de aplicación.`, blocking: true });
  }
  if (baseStatus === 'FAILED' && attempt.value === 0) {
    issues.push({ code: 'FAILED_WITH_ATTEMPT_ZERO', message: `${BLOCK_LABELS[block]} está reprobada con INTENTO = 0.`, blocking: true });
  }
  if (applicationDate && !rawCertificationStatus && !rawExamStatus && !statusOnlyBlock(block)) {
    issues.push({ code: 'DATE_WITHOUT_STATUS', message: `${BLOCK_LABELS[block]} tiene fecha de aplicación sin estado ni resultado.`, blocking: true });
  }
  if (score.value !== null && !applicationDate) {
    issues.push({ code: 'SCORE_WITHOUT_DATE', message: `${BLOCK_LABELS[block]} tiene promedio sin fecha de aplicación.`, blocking: true });
  }
  if (attempt.value !== null && !applicationDate && !statusOnlyBlock(block)) {
    issues.push({ code: 'ATTEMPT_WITHOUT_EVIDENCE', message: `${BLOCK_LABELS[block]} informa intento sin evidencia de aplicación.`, blocking: true });
  }
  if (applicable === false && (applicationDate || score.value !== null || attempt.value !== null || ['APROBADO','APROBADA','REPROBADO','REPROBADA'].includes(examKey))) {
    issues.push({ code: 'NOT_APPLICABLE_WITH_EVIDENCE', message: `${BLOCK_LABELS[block]} está marcada como No aplica pero contiene fecha, resultado, promedio o intento.`, blocking: true });
  }
  if (applicable === false && ['APROBADO','APROBADA','SI','FORMADO'].includes(statusKey)) {
    issues.push({ code: 'NOT_APPLICABLE_WITH_STATUS', message: `${BLOCK_LABELS[block]} está marcada como No aplica pero su estado indica aprobación/formación.`, blocking: true });
  }
  if (applicable === true && !rawCertificationStatus && statusOnlyBlock(block)) {
    issues.push({ code: 'APPLICABLE_WITHOUT_STATUS', message: `${BLOCK_LABELS[block]} aplica pero no contiene estado; no se inventará una aprobación.`, blocking: false });
  }

  let initialDueDate: string | null = null;
  if (!statusOnlyBlock(block) && !hadPreviousApproval && applicable !== false) {
    if (block === 'NORMATIVE_TESTING' && normativeLimitDate) initialDueDate = normativeLimitDate;
    else if (startDate && config?.initialCompletionDays) initialDueDate = addCalendarDays(startDate, config.initialCompletionDays);
  }

  const approvedDate = baseStatus === 'APPROVED' && applicationDate ? applicationDate : null;
  const expirationDate = approvedDate && config?.validityMonths ? addCalendarMonths(approvedDate, config.validityMonths) : null;
  const calculatedStatus = calculateStatus(baseStatus, expirationDate, config, args.todayIso ?? new Date().toISOString().slice(0, 10));
  const lifecycle = applicable === false
    ? 'NOT_APPLICABLE'
    : statusOnlyBlock(block)
      ? 'STATUS_ONLY'
      : hadPreviousApproval
        ? 'RECERTIFICATION'
        : 'INITIAL';

  const fingerprint = hash([
    block,
    applicable === null ? '' : applicable ? '1' : '0',
    normalizeKey(rawCertificationStatus),
    normalizeKey(rawExamStatus),
    applicationDate,
    score.value,
    attempt.value,
    normativeLimitDate,
    baseStatus,
    initialDueDate,
    expirationDate,
  ]);

  return {
    block,
    label: BLOCK_LABELS[block],
    applicable,
    rawApplicable,
    rawCertificationStatus,
    rawExamStatus,
    applicationDate,
    score10: score.value,
    administrativeAttempt: attempt.value,
    normativeLimitDate,
    baseStatus,
    initialDueDate,
    approvedDate,
    expirationDate,
    calculatedStatus,
    lifecycle,
    issues,
    fingerprint,
  };
}

export function importCertificationResolutionKey(args: {
  rowIdentity: string;
  block: ImportCertificationBlock;
  issueCode: string;
  sourceFingerprint: string;
  calculatedStatus?: ImportCertificationCalculatedStatus | null;
}): string {
  return hash(['CERTIFICATION', args.rowIdentity, args.block, args.issueCode, args.sourceFingerprint, args.calculatedStatus ?? '']);
}

export function importCertificationAttemptFingerprint(args: {
  block: ImportCertificationBlock;
  applicationDate: string | null;
  result: string | null;
  score10: number | null;
  administrativeAttempt: number | null;
}): string {
  return hash(['ATTEMPT', args.block, args.applicationDate, normalizeKey(args.result), args.score10, args.administrativeAttempt]);
}

export function certificationBlockLabel(block: ImportCertificationBlock): string {
  return BLOCK_LABELS[block];
}
