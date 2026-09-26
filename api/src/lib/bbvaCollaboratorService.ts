import type { CollaboratorRecord } from './bbvaCollaboratorDomain.js';
import { CollaboratorRepository } from './bbvaCollaboratorRepository.js';

const repository = new CollaboratorRepository();

export class CollaboratorService {
  list(): Promise<CollaboratorRecord[]> { return repository.list(); }
  get(id: string): Promise<CollaboratorRecord | null> { return repository.findById(id); }
}
