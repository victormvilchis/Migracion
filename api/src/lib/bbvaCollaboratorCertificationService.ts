import { CollaboratorCertificationRepository } from './bbvaCollaboratorCertificationRepository.js';
import type { CertificationAttemptInput, CertificationUpdateInput } from './bbvaCollaboratorCertificationDomain.js';
import { vendorQuarterContext } from './bbvaVendorCalendar.js';

const repository = new CollaboratorCertificationRepository();

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
    const items = await repository.tracking();
    const quarter = vendorQuarterContext();
    const exhaustedAttempts = items.filter((item) => item.latestAttemptResult === 'FAILED' && item.maxAttempts != null && item.attemptCount >= item.maxAttempts).length;
    return {
      items,
      vendorQuarter: {
        calendarName: quarter.calendarName,
        currentCode: quarter.currentQuarter?.code ?? null,
        targetCode: quarter.targetQuarter?.code ?? null,
        targetStartDate: quarter.targetQuarter?.startDate ?? null,
        targetEndDate: quarter.targetQuarter?.endDate ?? null,
        daysToTargetStart: quarter.daysToTargetStart,
        pendingCertifications: items.length,
        exhaustedAttempts,
      },
    };
  }

  async addManual(collaboratorId: string, payload: unknown, actorEmail: string) {
    const certificationId = String(valueOf(payload, 'certificationId') ?? '').trim();
    if (!certificationId) throw Object.assign(new Error('La certificación es obligatoria.'), { statusCode: 400 });
    const certificationLevel = cleanText(valueOf(payload, 'certificationLevel'), 16)?.toUpperCase() ?? null;
    return repository.addManual(collaboratorId, certificationId, certificationLevel, actorEmail);
  }

  async update(collaboratorId: string, recordId: string, payload: unknown, actorEmail: string) {
    const scheduledDate = normalizeDate(valueOf(payload, 'scheduledDate'), 'La fecha programada');
    if (scheduledDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (scheduledDate < today) throw Object.assign(new Error('La fecha programada no puede estar en el pasado.'), { statusCode: 400 });
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
      notes: cleanText(valueOf(payload, 'notes'), 1000),
    };
    return repository.addAttempt(collaboratorId, recordId, input, actorEmail);
  }

  recertify(collaboratorId: string, recordId: string, actorEmail: string) {
    return repository.recertify(collaboratorId, recordId, actorEmail);
  }

  markNotApplicable(collaboratorId: string, recordId: string, actorEmail: string) {
    return repository.markNotApplicable(collaboratorId, recordId, actorEmail);
  }
}
