import { bbvaCatalogDefinitions, type BbvaCatalogOption, type BbvaCatalogType } from './bbvaCatalogDomain.js';
import { BbvaCatalogService } from './bbvaCatalogService.js';

const catalogService = new BbvaCatalogService();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ProfessionalCatalogReferences {
  profileCatalogId: string | null;
  profile: string | null;
  profileSeniority: string | null;
  technologyProfileCatalogId: string | null;
  technologyProfile: string | null;
  currentTechnologyCatalogId: string | null;
  currentTechnology: string | null;
}

async function resolveOne(
  type: BbvaCatalogType,
  idValue: unknown,
  nameValue: unknown,
  label: string,
): Promise<BbvaCatalogOption | null> {
  const definition = bbvaCatalogDefinitions[type];
  const id = String(idValue ?? '').trim();
  const name = String(nameValue ?? '').trim();
  if (!id && !name) return null;

  let option: BbvaCatalogOption | null = null;
  if (id) {
    if (!UUID_RE.test(id)) throw new Error(`${label} no es válido.`);
    option = await catalogService.getActiveOption(definition, id);
  } else if (name) {
    option = await catalogService.getActiveOptionByName(definition, name);
  }

  if (!option) throw new Error(`${label} no existe en el catálogo activo.`);
  return option;
}

export async function resolveProfessionalCatalogReferences(payload: Record<string, unknown>): Promise<ProfessionalCatalogReferences> {
  const [profile, technologyProfile, technology] = await Promise.all([
    resolveOne('profiles', payload.profileCatalogId, payload.profile, 'El perfil'),
    resolveOne('technology-profiles', payload.technologyProfileCatalogId, payload.technologyProfile, 'El perfil tecnológico'),
    resolveOne('technologies', payload.currentTechnologyCatalogId, payload.currentTechnology, 'La tecnología'),
  ]);

  return {
    profileCatalogId: profile?.id ?? null,
    profile: profile?.name ?? null,
    profileSeniority: profile?.seniority ?? null,
    technologyProfileCatalogId: technologyProfile?.id ?? null,
    technologyProfile: technologyProfile?.name ?? null,
    currentTechnologyCatalogId: technology?.id ?? null,
    currentTechnology: technology?.name ?? null,
  };
}
