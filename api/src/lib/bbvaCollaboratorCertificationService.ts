import { CollaboratorCertificationRepository } from './bbvaCollaboratorCertificationRepository.js';
import type { CertificationAttemptInput, CertificationAttemptUpdateInput, CertificationUpdateInput, CertificationCriticalResolutionInput, CertificationCoverageUpdateInput } from './bbvaCollaboratorCertificationDomain.js';
import { CRITICAL_TWO_ATTEMPT_TYPES, isCriticalResolutionOpen, isCriticalTwoAttemptExhausted } from './bbvaCertificationRules.js';
import { vendorQuarterContext, vendorQuarterForDate } from './bbvaVendorCalendar.js';
import { BbvaOperationalQuarterRepository } from './bbvaOperationalQuarterRepository.js';
import { bbvaBusinessDate } from './bbvaBusinessTime.js';

const repository = new CollaboratorCertificationRepository();
const operationalQuarterRepository = new BbvaOperationalQuarterRepository();

function valueOf(payload: unknown, key: string): unknown {
  return payload && typeof payload === 'object' && key in payload ? (payload as Record<string, unknown>)[key] : undefined;
}

function cleanText(value: unknown, maxLength: number): string | null {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeDate(value: unknown, field: string): string | null {
  const candidate = String(value ?? '').trim();
  if (!candidate) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(Date.parse(`${candidate}T00:00:00Z`))) {
    throw Object.assign(new Error(`${field} debe tener formato YYYY-MM-DD.`), { statusCode: 400 });
  }
  return candidate;
}

function isCriticalTwoAttemptLimit(item: {
  certificationType: string;
  baseStatus: string;
  requiresAttempts: boolean;
  maxAttempts: number | null;
  attemptCount: number;
}): boolean {
  return item.baseStatus === 'FAILED'
    && item.requiresAttempts
    && item.maxAttempts === 2
    && item.attemptCount >= 2
    && CRITICAL_TWO_ATTEMPT_TYPES.has(String(item.certificationType ?? '').toUpperCase());
}

function hasOpenCriticalTwoAttempt(item: {
  certificationType: string;
  baseStatus: string;
  requiresAttempts: boolean;
  maxAttempts: number | null;
  attemptCount: number;
  criticalResolutionStatus: string | null;
}): boolean {
  return isCriticalTwoAttemptLimit(item) && isCriticalResolutionOpen(item.criticalResolutionStatus);
}

function normalizeScore10(value: unknown, tracksScore: boolean): number | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  if (!tracksScore) throw Object.assign(new Error('Esta certificación no maneja calificación.'), { statusCode: 400 });
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 10) throw Object.assign(new Error('La calificación debe estar entre 0 y 10.'), { statusCode: 400 });
  return Math.round(score * 100) / 100;
}

export class CollaboratorCertificationService {
  async synchronize(collaboratorId: string, actorEmail: string) {
    return repository.synchronize(collaboratorId, actorEmail);
  }

  list(collaboratorId: string, _actorEmail: string) {
    return repository.list(collaboratorId);
  }

  synchronizeAllActive(actorEmail: string) {
    return repository.synchronizeAllActive(actorEmail);
  }

  get(collaboratorId: string, recordId: string) {
    return repository.detail(collaboratorId, recordId);
  }

  async tracking() {
    const operationalQuarterOverrides = await operationalQuarterRepository.listOverrides();
    const rawItems = await repository.tracking();
    const items = rawItems.map((item) => ({ ...item, quarterCode: vendorQuarterForDate(item.expirationDate, operationalQuarterOverrides)?.code ?? null }));
    const quarter = vendorQuarterContext(new Date(), null, operationalQuarterOverrides);
    const metricItems = items.filter((item) => item.metricActive);
    const exhaustedAttempts = metricItems.filter((item) =>
      isCriticalTwoAttemptExhausted({
        certificationType: item.certificationType,
        maxAttempts: item.maxAttempts,
        attemptCount: item.attemptCount,
        latestAttemptResult: item.latestAttemptResult,
      }) && isCriticalResolutionOpen(item.criticalResolutionStatus),
    ).length;
    return {
      items,
      vendorQuarter: {
        calendarName: quarter.calendarName,
        currentCode: quarter.currentQuarter?.code ?? null,
        targetCode: quarter.targetQuarter?.code ?? null,
        targetStartDate: quarter.targetQuarter?.startDate ?? null,
        targetEndDate: quarter.targetQuarter?.endDate ?? null,
        daysToTargetStart: quarter.daysToTargetStart,
        pendingCertifications: metricItems.length,
        exhaustedAttempts,
        referenceDate: quarter.referenceDate,
        years: quarter.years,
        quarters: quarter.quarters,
      },
    };
  }

  async addManual(collaboratorId: string, payload: unknown, actorEmail: string) {
    const certificationId = String(valueOf(payload, 'certificationId') ?? '').trim();
    if (!certificationId) throw Object.assign(new Error('La certificación es obligatoria.'), { statusCode: 400 });
    const certificationLevel = cleanText(valueOf(payload, 'certificationLevel'), 16)?.toUpperCase() ?? null;
    return repository.addManual(collaboratorId, certificationId, certificationLevel, actorEmail);
  }

  async updateCoverage(collaboratorId: string, recordId: string, payload: unknown, actorEmail: string) {
    const rawMemberRecordIds = valueOf(payload, 'memberRecordIds');
    if (!Array.isArray(rawMemberRecordIds)) {
      throw Object.assign(new Error('Selecciona las certificaciones tecnológicas que formarán el grupo de cobertura.'), { statusCode: 400 });
    }
    const memberRecordIds = [...new Set(rawMemberRecordIds.map((value) => cleanText(value, 36)).filter((value): value is string => Boolean(value)))];
    if (!memberRecordIds.length) {
      throw Object.assign(new Error('El grupo de cobertura debe incluir al menos la certificación seleccionada.'), { statusCode: 400 });
    }
    if (memberRecordIds.length > 255) {
      throw Object.assign(new Error('Un grupo de cobertura admite hasta 255 certificaciones tecnológicas.'), { statusCode: 400 });
    }
    const input: CertificationCoverageUpdateInput = { memberRecordIds };
    return repository.updateCoverage(collaboratorId, recordId, input, actorEmail);
  }

  async update(collaboratorId: string, recordId: string, payload: unknown, actorEmail: string) {
    const current = await repository.detail(collaboratorId, recordId);
    if (!current) return null;
    const scheduledDate = normalizeDate(valueOf(payload, 'scheduledDate'), 'La fecha programada');
    if (scheduledDate) {
      const today = bbvaBusinessDate();
      if (scheduledDate < today) throw Object.assign(new Error('La fecha programada no puede estar en el pasado.'), { statusCode: 400 });
      if (isCriticalTwoAttemptLimit(current.item)) {
        throw Object.assign(new Error('La certificación agotó sus 2/2 intentos. No se puede programar otra presentación en el mismo ciclo; resuelve baja o becario.'), { statusCode: 409, code: 'MAX_ATTEMPTS_REACHED' });
      }
    }
    const input: CertificationUpdateInput = {
      scheduledDate,
      notes: cleanText(valueOf(payload, 'notes'), 1500),
      mandatory: Boolean(valueOf(payload, 'mandatory')),
    };
    return repository.update(collaboratorId, recordId, input, actorEmail);
  }

  async addAttempt(collaboratorId: string, recordId: string, payload: unknown, actorEmail: string) {
    const current = await repository.detail(collaboratorId, recordId);
    if (!current) return null;
    if (current.item.baseStatus === 'APPROVED') {
      throw Object.assign(new Error('La certificación ya está aprobada en el ciclo actual. Inicia una recertificación antes de registrar un nuevo intento.'), { statusCode: 409 });
    }
    const result = String(valueOf(payload, 'result') ?? 'PENDING').toUpperCase();
    if (!['PENDING', 'APPROVED', 'FAILED'].includes(result)) {
      throw Object.assign(new Error('El resultado del intento no es válido.'), { statusCode: 400 });
    }
    const applicationDate = normalizeDate(valueOf(payload, 'applicationDate'), 'La fecha de aplicación');
    const input: CertificationAttemptInput = {
      applicationDate,
      result: result as CertificationAttemptInput['result'],
      score10: normalizeScore10(valueOf(payload, 'score10'), current.item.tracksScore),
      notes: cleanText(valueOf(payload, 'notes'), 1000),
    };
    return repository.addAttempt(collaboratorId, recordId, input, actorEmail);
  }


  async updateAttempt(collaboratorId: string, recordId: string, attemptId: string, payload: unknown, actorEmail: string) {
    const current = await repository.detail(collaboratorId, recordId);
    if (!current) return null;
    const target = current.attempts.find((attempt) => attempt.id === attemptId);
    if (!target) throw Object.assign(new Error('El intento no existe.'), { statusCode: 404 });
    const result = String(valueOf(payload, 'result') ?? target.result).toUpperCase();
    if (!['PENDING','APPROVED','FAILED'].includes(result)) throw Object.assign(new Error('El resultado del intento no es válido.'), { statusCode: 400 });
    const attemptNumber = Number(valueOf(payload, 'attemptNumber') ?? target.attemptNumber);
    if (!Number.isInteger(attemptNumber) || attemptNumber < 1) throw Object.assign(new Error('El número de intento debe ser un entero mayor a cero.'), { statusCode: 400 });
    const input: CertificationAttemptUpdateInput = {
      attemptNumber,
      applicationDate: normalizeDate(valueOf(payload, 'applicationDate') ?? target.applicationDate, 'La fecha de aplicación'),
      result: result as CertificationAttemptUpdateInput['result'],
      score10: normalizeScore10(valueOf(payload, 'score10') ?? target.score10, current.item.tracksScore),
      notes: cleanText(valueOf(payload, 'notes') ?? target.notes, 1000),
    };
    return repository.updateAttempt(collaboratorId, recordId, attemptId, input, actorEmail);
  }

  async resolveCritical(collaboratorId: string, recordId: string, payload: unknown, actorEmail: string) {
    const resolution = String(valueOf(payload, 'resolution') ?? '').trim().toUpperCase();
    if (!['LOW_REQUESTED', 'INTERN'].includes(resolution)) {
      throw Object.assign(new Error('Selecciona una resolución válida: solicitar baja o becario.'), { statusCode: 400 });
    }
    const current = await repository.detail(collaboratorId, recordId);
    if (!current) return null;
    if (current.item.criticalResolutionStatus === 'INTERN') {
      throw Object.assign(new Error('El caso crítico ya fue resuelto como becario para este ciclo.'), { statusCode: 409, code: 'CRITICAL_RESOLUTION_CLOSED' });
    }
    if (current.item.criticalResolutionStatus === 'LOW_CONFIRMED') {
      throw Object.assign(new Error('La baja de BBVA ya fue confirmada para este ciclo.'), { statusCode: 409, code: 'CRITICAL_RESOLUTION_CLOSED' });
    }
    const input: CertificationCriticalResolutionInput = {
      resolution: resolution as CertificationCriticalResolutionInput['resolution'],
      notes: cleanText(valueOf(payload, 'notes'), 1000),
    };
    return repository.resolveCritical(collaboratorId, recordId, input, actorEmail);
  }

  recertify(collaboratorId: string, recordId: string, actorEmail: string) {
    return repository.recertify(collaboratorId, recordId, actorEmail);
  }

  async markNotApplicable(collaboratorId: string, recordId: string, actorEmail: string) {
    const current = await repository.detail(collaboratorId, recordId);
    if (!current) return null;
    if (hasOpenCriticalTwoAttempt(current.item)) {
      throw Object.assign(new Error('La certificación tiene un caso crítico 2/2 pendiente. Resuelve baja o becario antes de quitarla del seguimiento.'), { statusCode: 409, code: 'CRITICAL_RESOLUTION_REQUIRED' });
    }
    return repository.markNotApplicable(collaboratorId, recordId, actorEmail);
  }
}
