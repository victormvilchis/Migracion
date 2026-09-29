import { BbvaEngineeringSpecialtyRepository } from './bbvaEngineeringSpecialtyRepository.js';
import type {
  EngineeringExplorerInsightItem,
  EngineeringExplorerLevel2Node,
  EngineeringExplorerPerson,
  EngineeringSpecialtyExplorer,
  EngineeringSpecialtyInput,
  EngineeringSpecialtyStatus,
} from './bbvaEngineeringSpecialtyDomain.js';

const repo = new BbvaEngineeringSpecialtyRepository();
const clean = (value: unknown, max = 220) => { const normalized = String(value ?? '').trim().replace(/\s+/g, ' '); return normalized ? normalized.slice(0, max) : null; };
const upper = (value: unknown, max = 220) => clean(value, max)?.toLocaleUpperCase('es-MX') ?? null;
const key = (value: unknown) => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-MX');
const isMissingStaffer = (value: string | null) => !value || ['TBD', 'N/A', 'NA', 'NO DISPONIBLE'].includes(key(value));

export class BbvaEngineeringSpecialtyService {
  list(search: string, status: EngineeringSpecialtyStatus | 'ALL', page: number, size: number) { return repo.list(search, status, page, size); }
  get(id: string) { return repo.get(id); }

  async explorer(): Promise<EngineeringSpecialtyExplorer> {
    const source = await repo.explorerSource();
    const level2 = source.structures.filter((item) => item.level === 2);
    const level3 = source.structures.filter((item) => item.level === 3);
    const activeLevel2 = level2.filter((item) => item.status === 'ACTIVE');
    const activeLevel3 = level3.filter((item) => item.status === 'ACTIVE');
    const activeSpecialties = source.specialties.filter((item) => item.status === 'ACTIVE');

    const peopleByPair = new Map<string, EngineeringExplorerPerson[]>();
    for (const person of source.collaborators) {
      const pair = `${key(person.level2)}::${key(person.level3)}`;
      const list = peopleByPair.get(pair) ?? [];
      list.push({ id: person.id, fullName: person.fullName, profile: person.profile, technology: person.technology, deliveryManager: person.deliveryManager });
      peopleByPair.set(pair, list);
    }

    const specialtiesByPair = new Map<string, typeof source.specialties>();
    for (const specialty of source.specialties) {
      const pair = `${key(specialty.n3)}::${key(specialty.guild)}`;
      const list = specialtiesByPair.get(pair) ?? [];
      list.push(specialty);
      specialtiesByPair.set(pair, list);
    }

    const hierarchy: EngineeringExplorerLevel2Node[] = level2.map((parent) => {
      const children = level3.filter((child) => child.parentId === parent.id).map((child) => {
        const pair = `${key(parent.name)}::${key(child.name)}`;
        const specialties = (specialtiesByPair.get(pair) ?? []).map((item) => ({
          id: item.id,
          name: item.specialty,
          staffer: item.staffer,
          guildLeader: item.guildLeader,
          specialtyOwner: item.specialtyOwner,
          portfolioStaffing: item.portfolioStaffing,
          status: item.status,
        }));
        const people = peopleByPair.get(pair) ?? [];
        return {
          id: child.id,
          name: child.name,
          parentId: parent.id,
          parentName: parent.name,
          description: child.description,
          status: child.status,
          collaboratorCount: people.length,
          specialties,
          people,
        };
      });
      return {
        id: parent.id,
        name: parent.name,
        description: parent.description,
        status: parent.status,
        collaboratorCount: children.reduce((sum, child) => sum + child.collaboratorCount, 0),
        specialtyCount: children.reduce((sum, child) => sum + child.specialties.filter((item) => item.status === 'ACTIVE').length, 0),
        level3: children,
      };
    });

    const activePairs = new Set(activeLevel3.map((child) => {
      const parent = activeLevel2.find((item) => item.id === child.parentId);
      return parent ? `${key(parent.name)}::${key(child.name)}` : '';
    }).filter(Boolean));
    const specialtyPairs = new Set(activeSpecialties.map((item) => `${key(item.n3)}::${key(item.guild)}`));
    const coveredCollaborators = source.collaborators.filter((person) => {
      const pair = `${key(person.level2)}::${key(person.level3)}`;
      return activePairs.has(pair) && specialtyPairs.has(pair);
    });
    const activeCollaborators = source.collaborators.length;
    const coverage = activeCollaborators ? Math.round((coveredCollaborators.length / activeCollaborators) * 10_000) / 100 : 100;

    const heatmap = hierarchy.flatMap((parent) => parent.level3.map((child) => ({
      level2Id: parent.id,
      level2Name: parent.name,
      level3Id: child.id,
      level3Name: child.name,
      collaboratorCount: child.collaboratorCount,
      specialtyCount: child.specialties.filter((item) => item.status === 'ACTIVE').length,
    })));

    const topGuildsByCollaborators: EngineeringExplorerInsightItem[] = [...heatmap]
      .sort((a, b) => b.collaboratorCount - a.collaboratorCount || a.level3Name.localeCompare(b.level3Name, 'es-MX'))
      .slice(0, 8)
      .map((item) => ({ key: item.level3Id, label: item.level3Name, count: item.collaboratorCount, secondary: item.level2Name }));

    const topStructuresBySpecialties: EngineeringExplorerInsightItem[] = hierarchy
      .map((item) => ({ key: item.id, label: item.name, count: item.specialtyCount, secondary: `${item.level3.length} NIVEL 3` }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es-MX'))
      .slice(0, 8);

    const stafferCounts = new Map<string, number>();
    for (const item of activeSpecialties) {
      if (isMissingStaffer(item.staffer)) continue;
      const label = String(item.staffer).trim();
      stafferCounts.set(label, (stafferCounts.get(label) ?? 0) + 1);
    }
    const topStaffersBySpecialties: EngineeringExplorerInsightItem[] = [...stafferCounts.entries()]
      .map(([label, count]) => ({ key: key(label), label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es-MX'))
      .slice(0, 8);

    const structuresWithoutSpecialties: EngineeringExplorerInsightItem[] = heatmap
      .filter((item) => item.specialtyCount === 0)
      .map((item) => ({ key: item.level3Id, label: item.level3Name, count: item.collaboratorCount, secondary: item.level2Name }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es-MX'));

    const collaboratorsOutsideHierarchy = source.collaborators
      .filter((person) => {
        const pair = `${key(person.level2)}::${key(person.level3)}`;
        return !activePairs.has(pair) || !specialtyPairs.has(pair);
      })
      .map((person) => ({ id: person.id, fullName: person.fullName, profile: person.profile, technology: person.technology, deliveryManager: person.deliveryManager }));

    const structurePairs = new Set(level3.map((child) => {
      const parent = level2.find((item) => item.id === child.parentId);
      return parent ? `${key(parent.name)}::${key(child.name)}` : '';
    }).filter(Boolean));
    const unmatched = new Map<string, { label: string; count: number; secondary: string }>();
    for (const item of activeSpecialties) {
      const pair = `${key(item.n3)}::${key(item.guild)}`;
      if (structurePairs.has(pair)) continue;
      const current = unmatched.get(pair) ?? { label: item.guild, count: 0, secondary: item.n3 };
      current.count += 1;
      unmatched.set(pair, current);
    }

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        guilds: new Set(activeSpecialties.map((item) => `${key(item.n3)}::${key(item.guild)}`)).size,
        specialties: activeSpecialties.length,
        structureLevel2: activeLevel2.length,
        structureLevel3: activeLevel3.length,
        activeCollaborators,
        coveredCollaborators: coveredCollaborators.length,
        collaboratorCoveragePercent: coverage,
      },
      hierarchy,
      heatmap,
      filters: {
        staffers: [...new Set(activeSpecialties.map((item) => item.staffer?.trim()).filter((value): value is string => Boolean(value) && !isMissingStaffer(value)))].sort((a, b) => a.localeCompare(b, 'es-MX')),
      },
      insights: {
        topGuildsByCollaborators,
        topStructuresBySpecialties,
        topStaffersBySpecialties,
        structuresWithoutSpecialties,
        collaboratorsOutsideHierarchy,
        unmatchedSpecialtyGroups: [...unmatched.entries()].map(([pair, item]) => ({ key: pair, label: item.label, count: item.count, secondary: item.secondary })).sort((a, b) => b.count - a.count),
        specialtiesWithoutStaffer: activeSpecialties.filter((item) => isMissingStaffer(item.staffer)).length,
      },
    };
  }

  private input(payload: any): EngineeringSpecialtyInput {
    const n3 = upper(payload?.n3, 180), guild = upper(payload?.guild), specialty = upper(payload?.specialty);
    if (!n3 || !guild || !specialty) throw Object.assign(new Error('Estructura nivel 2, gremio / nivel 3 y especialidad son obligatorios.'), { statusCode: 400 });
    return { n3, guild, specialty, guildLeader: upper(payload?.guildLeader), specialtyOwner: upper(payload?.specialtyOwner), portfolioStaffing: upper(payload?.portfolioStaffing), staffer: upper(payload?.staffer) };
  }

  private async validateHierarchy(input: EngineeringSpecialtyInput): Promise<void> {
    if (!(await repo.structurePairExists(input.n3, input.guild))) {
      throw Object.assign(new Error('El gremio / nivel 3 debe pertenecer a la estructura nivel 2 seleccionada y estar activo.'), { statusCode: 409 });
    }
  }

  async create(payload: any, actor: string) { const input = this.input(payload); await this.validateHierarchy(input); return repo.create(input, actor); }
  async update(id: string, payload: any, actor: string) { const input = this.input(payload); await this.validateHierarchy(input); return repo.update(id, input, actor); }
  status(id: string, status: EngineeringSpecialtyStatus, actor: string) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) throw Object.assign(new Error('Estado inválido.'), { statusCode: 400 });
    return repo.status(id, status, actor);
  }
}
