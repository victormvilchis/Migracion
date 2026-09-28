import { TalentConversionRepository, type TalentConversionInput } from './bbvaTalentConversionRepository.js';
import { TalentRepository } from './bbvaTalentRepository.js';
import { CollaboratorCertificationService } from './bbvaCollaboratorCertificationService.js';
import { BbvaUserAdminService } from './bbvaUserAdminService.js';
import { resolveProfessionalCatalogReferences } from './bbvaProfessionalCatalogService.js';

const talentRepository = new TalentRepository();
const conversionRepository = new TalentConversionRepository();
const certificationService = new CollaboratorCertificationService();
const userAdminService = new BbvaUserAdminService();
const EXPERTISE = new Set(['TR', 'JR', 'STD', 'SR']);

function cleanText(value: unknown, max: number): string | null {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
}

/** Caso de uso cross-domain. La edición profesional y la conversión se confirman en una sola transacción. */
export class TalentConversionService {
  async convert(id: string, payload: Record<string, unknown>, actorEmail: string) {
    const current = await talentRepository.findById(id);
    if (!current) return null;
    if (current.recordStatus === 'DELETED' || !current.active || current.stage === 'CONVERTED') {
      throw Object.assign(new Error('El registro ya no está activo en Banco de talento.'), { statusCode: 409 });
    }

    const expectedUpdatedAt = cleanText(payload?.expectedUpdatedAt, 64);
    if (!expectedUpdatedAt) {
      throw Object.assign(new Error('Actualiza la pantalla antes de convertir para validar la versión vigente del registro.'), { statusCode: 409 });
    }

    const catalogs = await resolveProfessionalCatalogReferences(payload ?? {});
    if (!catalogs.profileCatalogId) throw new Error('El Perfil es obligatorio y debe provenir del catálogo para realizar la conversión.');
    if (!catalogs.technologyProfileCatalogId) throw new Error('El Perfil tecnológico es obligatorio y debe provenir del catálogo para realizar la conversión.');
    if (!catalogs.currentTechnologyCatalogId) throw new Error('La Tecnología actual es obligatoria y debe provenir del catálogo para realizar la conversión.');

    const expertise = (cleanText(payload?.expertise, 16)?.toUpperCase() ?? catalogs.profileSeniority ?? current.expertise ?? '').toUpperCase();
    if (expertise && !EXPERTISE.has(expertise)) throw new Error('El nivel de experiencia no es válido.');
    const deliveryManager = await userAdminService.resolveDeliveryManagerName(payload?.deliveryManager);

    const input: TalentConversionInput = {
      expectedUpdatedAt,
      deliveryManager,
      profileCatalogId: catalogs.profileCatalogId,
      profile: catalogs.profile,
      technologyProfileCatalogId: catalogs.technologyProfileCatalogId,
      technologyProfile: catalogs.technologyProfile,
      currentTechnologyCatalogId: catalogs.currentTechnologyCatalogId,
      currentTechnology: catalogs.currentTechnology,
      expertise: expertise || null,
      bbvaUser: cleanText(payload?.bbvaUser, 100)?.toUpperCase() ?? current.bbvaUser ?? current.corporateUser ?? null,
    };

    const result = await conversionRepository.convert(current, input, actorEmail);
    try {
      await certificationService.synchronize(result.collaboratorId, actorEmail);
      return { ...result, warning: null };
    } catch {
      // La conversión ya quedó confirmada de forma atómica. No devolver un falso error de conversión
      // por una sincronización secundaria; se deja señal explícita para soporte/reintento.
      return { ...result, warning: 'La conversión quedó guardada, pero la sincronización de certificaciones requiere reintento.' };
    }
  }
}
