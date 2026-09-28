import { getEffectiveUserEmail } from '../devConfig';

const FEEDBACK_EVENT = 'bbva:operation-feedback';
let operationSequence = 0;

function isMutation(method?: string) {
  const normalized = String(method ?? 'GET').toUpperCase();
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalized);
}

function operationLabel(endpoint: string, method?: string) {
  const normalized = String(method ?? 'GET').toUpperCase();
  if (endpoint.includes('/communications') && endpoint.endsWith('/email')) return 'Preparando correo';
  if (endpoint.includes('/communications')) return 'Generando comunicación';
  if (endpoint.includes('/critical-resolution')) return 'Guardando resolución crítica';
  if (endpoint.includes('/attempts')) return 'Registrando resultado';
  if (endpoint.includes('/recertify')) return 'Iniciando recertificación';
  if (endpoint.includes('/move-to-talent')) return 'Moviendo a Banco de talento';
  if (endpoint.includes('/snapshots/capture')) return 'Actualizando histórico KPI';
  if (normalized === 'DELETE') return 'Aplicando cambio';
  return 'Guardando cambios';
}

function publishFeedback(id: string, status: 'start' | 'success' | 'error', message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FEEDBACK_EVENT, { detail: { id, status, message } }));
}

/**
 * Cliente para llamadas a la API de Azure Functions en local (/api/*).
 * Incluye automáticamente el header de desarrollo x-dev-user-email.
 *
 * Estándar BBVA BFS: toda mutación muestra feedback visible de inicio y de
 * respuesta del servidor. Los GET permanecen silenciosos para no generar ruido.
 */
export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? `/api${endpoint}` : `/api/${endpoint}`;
  const mutation = isMutation(options.method);
  const operationId = mutation ? `bbva-op-${Date.now()}-${++operationSequence}` : '';
  const label = operationLabel(endpoint, options.method);

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('x-dev-user-email', getEffectiveUserEmail());

  if (mutation) publishFeedback(operationId, 'start', `${label}...`);

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      let errorDetail = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.error || errorJson.details || errorDetail;
      } catch {
        // Usar texto estándar si no es JSON.
      }
      throw new Error(errorDetail);
    }

    const text = await response.text();
    const result = text ? JSON.parse(text) as T : (undefined as T);
    if (mutation) publishFeedback(operationId, 'success', `${label}: servidor confirmó la operación.`);
    return result;
  } catch (error) {
    if (mutation) publishFeedback(operationId, 'error', `${label}: ${(error as Error).message}`);
    throw error;
  }
}
