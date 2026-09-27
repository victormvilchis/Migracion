import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function readBbvaJson(request: HttpRequest): Promise<any> {
  try { return await request.json(); }
  catch { throw Object.assign(new Error('El cuerpo de la solicitud debe ser JSON válido.'), { statusCode: 400 }); }
}

export function bbvaErrorResponse(error: unknown, context: InvocationContext, scope: 'TalentBank' | 'Collaborators'): HttpResponseInit {
  const value = error as { message?: string; number?: number; statusCode?: number };
  const message = value?.message || String(error);
  context.error(`[BBVA:${scope}] Error:`, message);
  if (value?.statusCode === 403) return { status: 403, jsonBody: { error: message } };
  if (value?.statusCode === 400) return { status: 400, jsonBody: { error: message } };
  if (value?.statusCode === 409) return { status: 409, jsonBody: { error: message } };
  const duplicate = value?.number === 2601 || value?.number === 2627 || /duplicate|unique|duplicad/i.test(message);
  if (duplicate) return { status: 409, jsonBody: { error: 'Ya existe una persona con el mismo correo, IS o Usuario corporativo.' } };
  if (/obligatorio|inválid|formato|permitid|vencimiento|conversión|catálogo|inactiv|etapa destino|fecha efectiva|motivo/i.test(message)) return { status: 400, jsonBody: { error: message } };
  return { status: 500, jsonBody: { error: `No fue posible completar la operación de ${scope === 'TalentBank' ? 'Banco de talento' : 'Colaboradores'}.` } };
}
