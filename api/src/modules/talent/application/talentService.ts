import { TALENT_STAGES, type TalentInput, type TalentRecord, type TalentStage } from '../domain/talent.js';
import { TalentRepository } from '../infrastructure/talentRepository.js';

const repository = new TalentRepository();

function cleanText(value: unknown, maxLength: number): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function normalizeStage(value: unknown): TalentStage {
  const stage = String(value ?? 'PROSPECT').trim().toUpperCase() as TalentStage;
  if (!TALENT_STAGES.includes(stage)) {
    throw new Error(`Etapa inválida. Valores permitidos: ${TALENT_STAGES.join(', ')}.`);
  }
  return stage;
}

function normalizeDate(value: unknown): string {
  const candidate = String(value ?? '').trim();
  if (!candidate) return new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(Date.parse(`${candidate}T00:00:00Z`))) {
    throw new Error('entryDate debe tener formato YYYY-MM-DD.');
  }
  return candidate;
}

function normalizePayload(payload: any): Required<Omit<TalentInput, 'entryDate'>> & { entryDate: string } {
  const fullName = cleanText(payload?.fullName, 200);
  if (!fullName || fullName.length < 2) {
    throw new Error('fullName es requerido y debe tener al menos 2 caracteres.');
  }

  const email = cleanText(payload?.email, 255);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('email no tiene un formato válido.');
  }

  return {
    fullName,
    email,
    profile: cleanText(payload?.profile, 120),
    technologyProfile: cleanText(payload?.technologyProfile, 120),
    targetTechnology: cleanText(payload?.targetTechnology, 120),
    stage: normalizeStage(payload?.stage),
    active: payload?.active === undefined ? true : Boolean(payload.active),
    entryDate: normalizeDate(payload?.entryDate),
    notes: cleanText(payload?.notes, 1000),
  };
}

export class TalentService {
  list(): Promise<TalentRecord[]> {
    return repository.list();
  }

  get(id: string): Promise<TalentRecord | null> {
    return repository.findById(id);
  }

  create(payload: any, actorEmail: string): Promise<TalentRecord> {
    return repository.create(normalizePayload(payload), actorEmail);
  }

  update(id: string, payload: any, actorEmail: string): Promise<TalentRecord | null> {
    return repository.update(id, normalizePayload(payload), actorEmail);
  }

  updateStage(id: string, stageValue: unknown, actorEmail: string): Promise<TalentRecord | null> {
    return repository.updateStage(id, normalizeStage(stageValue), actorEmail);
  }
}
