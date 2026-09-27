import type { CollaboratorInput, CollaboratorRecord } from './bbvaCollaboratorDomain.js';
import { CollaboratorRepository } from './bbvaCollaboratorRepository.js';
import { resolveProfessionalCatalogReferences } from './bbvaProfessionalCatalogService.js';
import { CollaboratorCertificationService } from './bbvaCollaboratorCertificationService.js';

const repository = new CollaboratorRepository();
const certificationService = new CollaboratorCertificationService();

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

async function normalizePayload(payload: any): Promise<CollaboratorInput> {
  const email = requiredText(payload?.email, 'El correo electrónico', 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El correo electrónico no tiene un formato válido.');
  const startDate = normalizeDate(payload?.startDate, 'Fecha de alta');
  const catalogs = await resolveProfessionalCatalogReferences(payload ?? {});
  if (!catalogs.profileCatalogId) throw new Error('El perfil es obligatorio y debe seleccionarse del catálogo.');
  if (!catalogs.technologyProfileCatalogId) throw new Error('El perfil tecnológico es obligatorio y debe seleccionarse del catálogo.');
  if (!catalogs.currentTechnologyCatalogId) throw new Error('La tecnología actual es obligatoria y debe seleccionarse del catálogo.');

  return {
    softtekCode: cleanText(payload?.softtekCode, 80)?.toUpperCase() ?? null,
    corporateUser: cleanText(payload?.corporateUser, 100)?.toUpperCase() ?? null,
    email,
    firstName: requiredText(payload?.firstName, 'El nombre', 120),
    lastName: requiredText(payload?.lastName, 'Los apellidos', 180),
    profile: catalogs.profile,
    profileCatalogId: catalogs.profileCatalogId,
    technologyProfile: catalogs.technologyProfile,
    technologyProfileCatalogId: catalogs.technologyProfileCatalogId,
    currentTechnology: catalogs.currentTechnology,
    currentTechnologyCatalogId: catalogs.currentTechnologyCatalogId,
    expertise: cleanText(payload?.expertise, 40)?.toUpperCase() ?? catalogs.profileSeniority,
    startDate,
    hireDate: normalizeDate(payload?.hireDate, 'Fecha de contratación'),
    notes: cleanText(payload?.notes, 2000),
  };
}

export class CollaboratorService {
  list(): Promise<CollaboratorRecord[]> { return repository.list(); }
  get(id: string): Promise<CollaboratorRecord | null> { return repository.findById(id); }
  async create(payload: any, actorEmail: string): Promise<CollaboratorRecord> {
    const item = await repository.create(await normalizePayload(payload), actorEmail);
    await certificationService.synchronize(item.id, actorEmail);
    return (await repository.findById(item.id)) as CollaboratorRecord;
  }
  async update(id: string, payload: any, actorEmail: string): Promise<CollaboratorRecord | null> {
    const item = await repository.update(id, await normalizePayload(payload), actorEmail);
    if (!item) return null;
    await certificationService.synchronize(id, actorEmail);
    return repository.findById(id);
  }
  delete(id: string): Promise<boolean> { return repository.delete(id); }
}
