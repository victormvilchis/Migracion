import { randomUUID } from 'node:crypto';
import {
  CERTIFICATION_LEVELS,
  CERTIFICATION_TYPES,
  type CertificationCatalogInput,
  type CertificationCatalogListParams,
  type CertificationCatalogPage,
  type CertificationCatalogRecord,
  type CertificationCatalogStatus,
  type CertificationLevel,
  type CertificationProfileRuleInput,
  type CertificationType,
} from './bbvaCertificationCatalogDomain.js';
import { BbvaCertificationCatalogRepository } from './bbvaCertificationCatalogRepository.js';

const repository = new BbvaCertificationCatalogRepository();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nullableText(value: unknown, maxLength: number): string | null {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error(`El valor no puede exceder ${maxLength} caracteres.`);
  return normalized;
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  const normalized = nullableText(value, maxLength);
  if (!normalized) throw new Error(`${label} es obligatorio.`);
  return normalized;
}

function nullablePositiveInteger(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0 || number > 240) throw new Error(`${label} debe ser un entero entre 1 y 240.`);
  return number;
}


function nullableMoney(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1_000_000) throw new Error(`${label} debe ser un importe válido.`);
  return Math.round(number * 100) / 100;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function normalizeUuid(value: unknown, label: string, required = false): string | null {
  const id = String(value ?? '').trim();
  if (!id) {
    if (required) throw new Error(`${label} es obligatorio.`);
    return null;
  }
  if (!UUID_RE.test(id)) throw new Error(`${label} no es válido.`);
  return id;
}

function normalizeLevels(value: unknown): CertificationLevel[] {
  const input = Array.isArray(value) ? value : [];
  const levels = [...new Set(input.map((item) => String(item).trim().toUpperCase()))]
    .filter((item): item is CertificationLevel => CERTIFICATION_LEVELS.includes(item as CertificationLevel));
  if (levels.length !== input.length) throw new Error('Existe un nivel de certificación inválido.');
  return levels;
}

function normalizeProfileRules(value: unknown): CertificationProfileRuleInput[] {
  if (!Array.isArray(value)) return [];
  const byProfile = new Map<string, CertificationProfileRuleInput>();
  for (const item of value) {
    const record = (item ?? {}) as Record<string, unknown>;
    const profileId = normalizeUuid(record.profileId, 'El perfil', true) as string;
    byProfile.set(profileId, { profileId, mandatory: normalizeBoolean(record.mandatory) });
  }
  return [...byProfile.values()];
}

export class BbvaCertificationCatalogService {
  list(params: CertificationCatalogListParams): Promise<CertificationCatalogPage> {
    return repository.list(params);
  }

  options() {
    return repository.options();
  }

  get(id: string): Promise<CertificationCatalogRecord | null> {
    return repository.findById(id);
  }

  async create(payload: unknown, actorEmail: string): Promise<CertificationCatalogRecord> {
    return repository.create(await this.validate(payload, this.generateInternalCode()), actorEmail);
  }

  async update(id: string, payload: unknown, actorEmail: string): Promise<CertificationCatalogRecord | null> {
    const current = await repository.findById(id);
    if (!current) return null;
    return repository.update(id, await this.validate(payload, current.code), actorEmail);
  }

  async updateStatus(id: string, status: unknown, actorEmail: string): Promise<CertificationCatalogRecord | null> {
    if (status !== 'ACTIVE' && status !== 'INACTIVE') throw new Error('El estado de la certificación es inválido.');
    return repository.updateStatus(id, status as CertificationCatalogStatus, actorEmail);
  }

  delete(id: string, actorEmail: string): Promise<boolean> {
    return repository.delete(id, actorEmail);
  }

  private generateInternalCode(): string {
    return `CERT_${randomUUID().replace(/-/g, '').slice(0, 24).toUpperCase()}`;
  }

  private async validate(payload: unknown, internalCode: string): Promise<CertificationCatalogInput> {
    const value = (payload ?? {}) as Record<string, unknown>;
    const code = requiredText(internalCode, 'El identificador interno', 80).toUpperCase();
    const name = requiredText(value.name, 'El nombre', 180);
    const description = nullableText(value.description, 1000);
    const typeValue = String(value.certificationType ?? '').trim().toUpperCase() as CertificationType;
    if (!CERTIFICATION_TYPES.includes(typeValue)) throw new Error('El tipo de certificación es inválido.');

    const provider = nullableText(value.provider, 120);
    const technologyId = normalizeUuid(value.technologyId, 'La tecnología', typeValue === 'TECHNOLOGICAL');
    const validityMonths = nullablePositiveInteger(value.validityMonths, 'La vigencia');
    const initialCompletionMonths = nullablePositiveInteger(value.initialCompletionMonths, 'El tiempo inicial para completar');
    const expiringSoonDays = nullablePositiveInteger(value.expiringSoonDays, 'Los días de próxima expiración');
    const firstAttemptCost = nullableMoney(value.firstAttemptCost, 'El costo del primer intento');
    const subsequentAttemptCost = nullableMoney(value.subsequentAttemptCost, 'El costo de intentos posteriores');
    const costCurrency = nullableText(value.costCurrency, 8)?.toUpperCase() ?? null;
    const includesTraining = normalizeBoolean(value.includesTraining);
    const recertificationEnabled = normalizeBoolean(value.recertificationEnabled);
    const requiresAttempts = normalizeBoolean(value.requiresAttempts);
    const requiresApplicationDate = normalizeBoolean(value.requiresApplicationDate);
    const defaultMandatory = normalizeBoolean(value.defaultMandatory);
    const requirementGroup = nullableText(value.requirementGroup, 80)?.toUpperCase() ?? null;
    const requirementGroupMinimum = nullablePositiveInteger(value.requirementGroupMinimum, 'El mínimo del grupo');
    const allowedLevels = normalizeLevels(value.allowedLevels);
    const profileRules = normalizeProfileRules(value.profileRules);

    if (typeValue === 'TECHNOLOGICAL' && allowedLevels.length === 0) {
      throw new Error('La certificación tecnológica debe definir al menos un nivel permitido.');
    }
    if (typeValue !== 'TECHNOLOGICAL' && technologyId) {
      throw new Error('La tecnología solo puede asignarse a certificaciones tecnológicas.');
    }
    if ((firstAttemptCost !== null || subsequentAttemptCost !== null) && !costCurrency) throw new Error('La moneda es obligatoria cuando existe un costo configurado.');
    if (costCurrency && !['USD','MXN'].includes(costCurrency)) throw new Error('La moneda permitida es USD o MXN.');
    if (validityMonths && !expiringSoonDays) throw new Error('Configura los días de próxima expiración para certificaciones con vigencia.');
    if (recertificationEnabled && !validityMonths) {
      throw new Error('Una certificación con recertificación debe definir su vigencia en meses.');
    }
    if (!recertificationEnabled && validityMonths && typeValue === 'METHODOLOGICAL') {
      throw new Error('La certificación metodológica configurada como única no debe tener vigencia de recertificación.');
    }
    if (requirementGroupMinimum && !requirementGroup) {
      throw new Error('Debes indicar el grupo de requisito cuando configuras un mínimo de cumplimiento.');
    }
    if (technologyId && !(await repository.activeTechnologyExists(technologyId))) {
      throw new Error('La tecnología seleccionada no existe o está inactiva.');
    }
    if (!(await repository.activeProfilesExist(profileRules.map((rule) => rule.profileId)))) {
      throw new Error('Uno o más perfiles seleccionados no existen o están inactivos.');
    }

    return {
      code,
      name,
      description,
      certificationType: typeValue,
      provider,
      technologyId,
      validityMonths,
      initialCompletionMonths,
      expiringSoonDays,
      firstAttemptCost,
      subsequentAttemptCost,
      costCurrency,
      includesTraining,
      recertificationEnabled,
      requiresAttempts,
      requiresApplicationDate,
      defaultMandatory,
      requirementGroup,
      requirementGroupMinimum,
      allowedLevels,
      profileRules,
    };
  }
}
