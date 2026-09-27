import { TalentConversionRepository } from './bbvaTalentConversionRepository.js';
import { TalentRepository } from './bbvaTalentRepository.js';
import { CollaboratorCertificationService } from './bbvaCollaboratorCertificationService.js';

const talentRepository = new TalentRepository();
const conversionRepository = new TalentConversionRepository();
const certificationService = new CollaboratorCertificationService();

/** Caso de uso cross-domain. Los repositorios de Talent y Colaboradores permanecen desacoplados. */
export class TalentConversionService {
  async convert(id: string, payload: { deliveryManager?: string | null }, actorEmail: string) {
    const current = await talentRepository.findById(id);
    if (!current) return null;
    if (current.recordStatus === 'DELETED' || !current.active) throw Object.assign(new Error('El registro ya no está activo en Banco de talento.'), { statusCode: 409 });
    if (!current.profileCatalogId) throw new Error('El Perfil es obligatorio y debe provenir del catálogo para realizar la conversión.');
    if (!current.technologyProfileCatalogId) throw new Error('El Perfil tecnológico es obligatorio y debe provenir del catálogo para realizar la conversión.');
    if (!current.currentTechnologyCatalogId) throw new Error('La Tecnología actual es obligatoria y debe provenir del catálogo para realizar la conversión.');
    const deliveryManager = String(payload?.deliveryManager ?? '').trim();
    if (!deliveryManager) throw new Error('El DM es obligatorio para convertir una persona a colaborador.');
    const result = await conversionRepository.convert(current, deliveryManager.slice(0, 180), actorEmail);
    await certificationService.synchronize(result.collaboratorId, actorEmail);
    return result;
  }
}
