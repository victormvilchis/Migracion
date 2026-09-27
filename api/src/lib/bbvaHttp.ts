import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function readBbvaJson(request: HttpRequest): Promise<any> {
  try { return await request.json(); }
  catch { throw Object.assign(new Error('El cuerpo de la solicitud debe ser JSON válido.'), { statusCode: 400 }); }
}

export type BbvaErrorScope = 'TalentBank' | 'Collaborators' | 'CollaboratorImport' | 'CollaboratorCertifications' | 'Dashboard';

const scopeMessage: Record<BbvaErrorScope, string> = {
  TalentBank: 'Banco de talento',
  Collaborators: 'Colaboradores',
  CollaboratorImport: 'Importación de colaboradores',
  CollaboratorCertifications: 'Certificaciones del colaborador',
  Dashboard: 'Panel',
};

export function bbvaErrorResponse(error: unknown, context: InvocationContext, scope: BbvaErrorScope): HttpResponseInit {
  const value = error as { message?: string; number?: number; statusCode?: number };
  const message = value?.message || String(error);
  context.error(`[BBVA:${scope}] Error:`, message);
  if (value?.statusCode === 403) return { status: 403, jsonBody: { error: message } };
  if (value?.statusCode === 404) return { status: 404, jsonBody: { error: message } };
  if (value?.statusCode === 400) return { status: 400, jsonBody: { error: message } };
  if (value?.statusCode === 409) return { status: 409, jsonBody: { error: message } };
  const duplicate = value?.number === 2601 || value?.number === 2627 || /duplicate|unique|duplicad/i.test(message);
  if (duplicate) return { status: 409, jsonBody: { error: 'Ya existe un registro con los mismos datos únicos.' } };
  if (/obligatorio|inválid|formato|permitid|vencimiento|conversión|catálogo|inactiv|etapa destino|fecha efectiva|motivo|certificación/i.test(message)) return { status: 400, jsonBody: { error: message } };
  return { status: 500, jsonBody: { error: `No fue posible completar la operación de ${scopeMessage[scope]}.` } };
}
