import type { CollaboratorInput, CollaboratorRecord } from './bbvaCollaboratorDomain.js';
import { CollaboratorRepository } from './bbvaCollaboratorRepository.js';

const repository = new CollaboratorRepository();

function cleanText(value: unknown, maxLength: number): string | null {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, maxLength) : null;
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  const text = cleanText(value, maxLength);
  if (!text) throw new Error(`${field} es obligatorio.`);
  return text;
}

function normalizeDate(value: unknown, field: string): string | null {
  const candidate = String(value ?? '').trim();
  if (!candidate) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(Date.parse(`${candidate}T00:00:00Z`))) throw new Error(`${field} debe tener formato YYYY-MM-DD.`);
  return candidate;
}

function normalizePayload(payload: any): CollaboratorInput {
  const email = requiredText(payload?.email, 'El correo electrónico', 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El correo electrónico no tiene un formato válido.');
  const startDate = normalizeDate(payload?.startDate, 'Fecha de alta');
  const endDate = normalizeDate(payload?.endDate, 'Vencimiento');
  if (startDate && endDate && endDate < startDate) throw new Error('El vencimiento no puede ser anterior a la Fecha de alta.');

  return {
    softtekCode: cleanText(payload?.softtekCode, 80)?.toUpperCase() ?? null,
    corporateUser: cleanText(payload?.corporateUser, 100)?.toUpperCase() ?? null,
    email,
    firstName: requiredText(payload?.firstName, 'El nombre', 120),
    lastName: requiredText(payload?.lastName, 'Los apellidos', 180),
    profile: cleanText(payload?.profile, 120),
    technologyProfile: cleanText(payload?.technologyProfile, 120),
    currentTechnology: cleanText(payload?.currentTechnology, 120),
    expertise: cleanText(payload?.expertise, 40)?.toUpperCase() ?? null,
    startDate,
    endDate,
    hireDate: normalizeDate(payload?.hireDate, 'Fecha de contratación'),
    notes: cleanText(payload?.notes, 2000),
  };
}

export class CollaboratorService {
  list(): Promise<CollaboratorRecord[]> { return repository.list(); }
  get(id: string): Promise<CollaboratorRecord | null> { return repository.findById(id); }
  create(payload: any, actorEmail: string): Promise<CollaboratorRecord> { return repository.create(normalizePayload(payload), actorEmail); }
  update(id: string, payload: any, actorEmail: string): Promise<CollaboratorRecord | null> { return repository.update(id, normalizePayload(payload), actorEmail); }
  delete(id: string): Promise<boolean> { return repository.delete(id); }
}
