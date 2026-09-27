import type { BbvaIdentityDirectoryProvider, BbvaIdentityDirectoryRecord } from './bbvaIdentityDirectoryDomain.js';
import { BbvaIdentityDirectoryRepository } from './bbvaIdentityDirectoryRepository.js';

type HttpError = Error & { statusCode?: number };

function httpError(statusCode: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

const repository = new BbvaIdentityDirectoryRepository();

/**
 * Resolución canónica de IS para BBVA Workspace.
 * Primero consulta identidades que ya existen en BaseBFS para evitar duplicados.
 * Si existe un provider corporativo configurado, actúa como segunda fuente.
 */
export class BbvaIdentityDirectoryService {
  constructor(private readonly provider: BbvaIdentityDirectoryProvider | null = null) {}

  async lookup(rawIs: string): Promise<BbvaIdentityDirectoryRecord> {
    const isValue = rawIs.trim().toUpperCase();
    if (!isValue) throw httpError(400, 'El IS es obligatorio para realizar la búsqueda.');
    if (isValue.length > 80) throw httpError(400, 'El IS no puede exceder 80 caracteres.');

    const local = await repository.findLocalByIs(isValue);
    if (local) return local;

    if (!this.provider) {
      throw httpError(404, `No se encontró una persona registrada con el IS ${isValue}. Puedes capturarlo manualmente si es un alta nueva.`);
    }

    const result = await this.provider.lookup(isValue);
    if (!result) throw httpError(404, `No se encontró información para el IS ${isValue}.`);
    return { ...result, is: result.is.trim().toUpperCase(), source: this.provider.source };
  }
}
