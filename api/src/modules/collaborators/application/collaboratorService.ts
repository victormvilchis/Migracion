import type { CollaboratorRecord } from '../domain/collaborator.js';
import { CollaboratorRepository } from '../infrastructure/collaboratorRepository.js';

const repository = new CollaboratorRepository();

export class CollaboratorService {
  list(): Promise<CollaboratorRecord[]> { return repository.list(); }
  get(id: string): Promise<CollaboratorRecord | null> { return repository.findById(id); }
}
