import { CollaboratorRepository } from './bbvaCollaboratorRepository.js';
import { TalentRepository } from './bbvaTalentRepository.js';
import type { MoveCollaboratorToTalentInput } from './bbvaPersonLifecycleDomain.js';
import { PersonLifecycleRepository } from './bbvaPersonLifecycleRepository.js';
import { bbvaBusinessDate } from './bbvaBusinessTime.js';

const collaboratorRepository = new CollaboratorRepository();
const talentRepository = new TalentRepository();
const lifecycleRepository = new PersonLifecycleRepository();

function text(value: unknown, field: string, maxLength: number): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw Object.assign(new Error(`${field} es obligatorio.`), { statusCode: 400 });
  return normalized.slice(0, maxLength);
}

function date(value: unknown, field: string): string {
  const normalized = text(value, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw Object.assign(new Error(`${field} debe tener formato YYYY-MM-DD.`), { statusCode: 400 });
  }
  return normalized;
}

function normalizeMovePayload(payload: Record<string, unknown> | null): MoveCollaboratorToTalentInput {
  const talentStage = String(payload?.talentStage ?? '').trim().toUpperCase();
  if (talentStage !== 'AVAILABLE' && talentStage !== 'UNASSIGNED') {
    throw Object.assign(new Error('La etapa destino debe ser Disponible o Desasignado.'), { statusCode: 400 });
  }
  const affiliationType = String(payload?.affiliationType ?? 'INTERNAL').trim().toUpperCase();
  if (affiliationType !== 'INTERNAL' && affiliationType !== 'EXTERNAL') {
    throw Object.assign(new Error('La vinculación debe ser Interno o Externo.'), { statusCode: 400 });
  }
  const notesValue = String(payload?.notes ?? '').trim();
  return {
    reasonCode: text(payload?.reasonCode, 'El motivo', 40).toUpperCase(),
    effectiveDate: date(payload?.effectiveDate, 'La fecha efectiva'),
    talentStage,
    affiliationType: affiliationType as 'INTERNAL' | 'EXTERNAL',
    notes: notesValue ? notesValue.slice(0, 1000) : null,
    expectedUpdatedAt: text(payload?.expectedUpdatedAt, 'La versión del colaborador', 64),
  };
}

export class PersonLifecycleService {
  listReasons() { return lifecycleRepository.listReasons(); }

  async collaboratorTimeline(collaboratorId: string) {
    const collaborator = await collaboratorRepository.findById(collaboratorId);
    if (!collaborator) return null;
    return lifecycleRepository.listTimeline(collaborator.personId);
  }

  async talentTimeline(talentId: string) {
    const talent = await talentRepository.findById(talentId);
    if (!talent) return null;
    return lifecycleRepository.listTimeline(talent.personId);
  }

  async moveCollaboratorToTalent(collaboratorId: string, payload: Record<string, unknown> | null, actorEmail: string) {
    const collaborator = await collaboratorRepository.findById(collaboratorId);
    if (!collaborator) return null;
    if (collaborator.status !== 'ACTIVE') {
      throw Object.assign(new Error('El colaborador ya no está activo. Actualiza la pantalla antes de continuar.'), { statusCode: 409 });
    }
    const input = normalizeMovePayload(payload);
    if (collaborator.startDate && input.effectiveDate < collaborator.startDate) {
      throw Object.assign(new Error('La fecha efectiva no puede ser anterior a la fecha de alta del colaborador.'), { statusCode: 400 });
    }
    const today = bbvaBusinessDate();
    if (input.effectiveDate > today) {
      throw Object.assign(new Error('La fecha efectiva no puede estar en el futuro porque el movimiento se aplica inmediatamente.'), { statusCode: 400 });
    }
    return lifecycleRepository.moveCollaboratorToTalent(collaborator, input, actorEmail);
  }
}
