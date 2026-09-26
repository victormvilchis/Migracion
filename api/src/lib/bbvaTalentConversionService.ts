import { TalentConversionRepository } from './bbvaTalentConversionRepository.js';
import { TalentRepository } from './bbvaTalentRepository.js';

const talentRepository = new TalentRepository();
const conversionRepository = new TalentConversionRepository();

/** Caso de uso cross-domain. Los repositorios de Talent y Colaboradores permanecen desacoplados. */
export class TalentConversionService {
  async convert(id: string, actorEmail: string) {
    const current = await talentRepository.findById(id);
    if (!current) return null;
    if (!current.profile) throw new Error('El Perfil es obligatorio para realizar la conversión.');
    if (!current.technologyProfile) throw new Error('El Perfil tecnológico es obligatorio para realizar la conversión.');
    if (!current.currentTechnology) throw new Error('La Tecnología actual es obligatoria para realizar la conversión.');
    return conversionRepository.convert(current, actorEmail);
  }
}
