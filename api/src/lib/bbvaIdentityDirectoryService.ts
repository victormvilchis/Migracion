import type { BbvaIdentityDirectoryProvider, BbvaIdentityDirectoryRecord } from './bbvaIdentityDirectoryDomain.js';

type HttpError = Error & { statusCode?: number };

function httpError(statusCode: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

/**
 * Punto de extensión para la fuente corporativa de IS.
 *
 * La UI y el contrato HTTP ya consumen una proyección canónica de persona.
 * Cuando BBVA/Softtek confirme la fuente real, se implementará un provider que
 * traduzca su contrato al modelo BbvaIdentityDirectoryRecord sin acoplar los
 * formularios a la API externa.
 */
export class BbvaIdentityDirectoryService {
  constructor(private readonly provider: BbvaIdentityDirectoryProvider | null = null) {}

  async lookup(rawIs: string): Promise<BbvaIdentityDirectoryRecord> {
    const isValue = rawIs.trim().toUpperCase();
    if (!isValue) throw httpError(400, 'El IS es obligatorio para realizar la búsqueda.');
    if (isValue.length > 80) throw httpError(400, 'El IS no puede exceder 80 caracteres.');

    if (!this.provider) {
      throw httpError(501, 'La búsqueda de IS está preparada, pero la fuente corporativa aún no ha sido configurada.');
    }

    const result = await this.provider.lookup(isValue);
    if (!result) throw httpError(404, `No se encontró información para el IS ${isValue}.`);
    return { ...result, is: result.is.trim().toUpperCase(), source: this.provider.source };
  }
}
