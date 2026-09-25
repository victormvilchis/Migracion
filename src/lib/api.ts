import { getEffectiveUserEmail } from '../devConfig';

/**
 * Cliente para llamadas a la API de Azure Functions en local (/api/*).
 * Incluye automáticamente el header de desarrollo x-dev-user-email.
 */
export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? `/api${endpoint}` : `/api/${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Header de usuario local para simulación de contexto y permisos
  headers.set('x-dev-user-email', getEffectiveUserEmail());

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.error || errorJson.details || errorDetail;
    } catch {
      // Usar texto estándar si no es JSON
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
