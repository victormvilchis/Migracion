import type {
  BbvaCatalogDefinition,
  BbvaCatalogInput,
  BbvaCatalogListParams,
  BbvaCatalogPage,
  BbvaCatalogRecord,
  BbvaCatalogStatus,
} from './bbvaCatalogDomain.js';
import { BbvaCatalogRepository } from './bbvaCatalogRepository.js';

export class BbvaCatalogService {
  private readonly repository = new BbvaCatalogRepository();

  list(definition: BbvaCatalogDefinition, params: BbvaCatalogListParams): Promise<BbvaCatalogPage> {
    return this.repository.list(definition, params);
  }

  get(definition: BbvaCatalogDefinition, id: string): Promise<BbvaCatalogRecord | null> {
    return this.repository.findById(definition, id);
  }

  create(definition: BbvaCatalogDefinition, payload: unknown, actorEmail: string): Promise<BbvaCatalogRecord> {
    return this.repository.create(definition, this.validate(definition, payload), actorEmail);
  }

  update(definition: BbvaCatalogDefinition, id: string, payload: unknown, actorEmail: string): Promise<BbvaCatalogRecord | null> {
    return this.repository.update(definition, id, this.validate(definition, payload), actorEmail);
  }

  updateStatus(definition: BbvaCatalogDefinition, id: string, status: unknown, actorEmail: string): Promise<BbvaCatalogRecord | null> {
    if (status !== 'ACTIVE' && status !== 'INACTIVE') throw new Error('El estado del catálogo es inválido.');
    return this.repository.updateStatus(definition, id, status as BbvaCatalogStatus, actorEmail);
  }

  delete(definition: BbvaCatalogDefinition, id: string): Promise<boolean> {
    return this.repository.delete(definition, id);
  }

  private validate(definition: BbvaCatalogDefinition, payload: unknown): BbvaCatalogInput {
    const value = (payload ?? {}) as Record<string, unknown>;
    const name = String(value.name ?? '').trim().replace(/\s+/g, ' ');
    const code = String(value.code ?? '').trim().replace(/\s+/g, ' ');
    const description = String(value.description ?? '').trim();
    const seniority = String(value.seniority ?? '').trim().replace(/\s+/g, ' ');

    if (!name) throw new Error(`El nombre de ${definition.singularLabel} es obligatorio.`);
    if (name.length > 180) throw new Error('El nombre no puede exceder 180 caracteres.');
    if (code.length > 80) throw new Error('El código no puede exceder 80 caracteres.');
    if (description.length > 500) throw new Error('La descripción no puede exceder 500 caracteres.');
    if (seniority.length > 40) throw new Error('El seniority no puede exceder 40 caracteres.');

    return {
      name,
      code: definition.supportsCode ? (code || null) : null,
      description: description || null,
      seniority: definition.supportsSeniority ? (seniority || null) : null,
    };
  }
}
