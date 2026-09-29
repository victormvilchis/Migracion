import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';
import { readBbvaJson } from '../lib/bbvaHttp.js';
import { BbvaEngineeringSpecialtyService } from '../lib/bbvaEngineeringSpecialtyService.js';

const service = new BbvaEngineeringSpecialtyService();
const fail = (error: unknown, context: InvocationContext): HttpResponseInit => {
  const value = error as { message?: string; statusCode?: number; number?: number };
  context.error('[BBVA:EngineeringSpecialties]', value?.message || error);
  if (value?.statusCode) return { status: value.statusCode, jsonBody: { error: value.message } };
  if (value?.number === 2601 || value?.number === 2627) return { status: 409, jsonBody: { error: 'La especialidad ya existe dentro del mismo gremio.' } };
  return { status: 500, jsonBody: { error: 'No fue posible completar la operación.' } };
};

async function collection(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    if (request.method === 'GET') {
      assertBbvaPermission(user, 'CATALOG_READ');
      return { status: 200, jsonBody: await service.list(request.query.get('search') ?? '', (request.query.get('status') ?? 'ACTIVE') as any, Number(request.query.get('page') ?? 0), Number(request.query.get('size') ?? 10)) };
    }
    assertBbvaPermission(user, 'CATALOG_WRITE');
    return { status: 201, jsonBody: { item: await service.create(await readBbvaJson(request), user.email) } };
  } catch (error) { return fail(error, context); }
}

async function explorer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'CATALOG_READ');
    assertBbvaPermission(user, 'COLLABORATOR_READ');
    return { status: 200, jsonBody: await service.explorer() };
  } catch (error) { return fail(error, context); }
}

async function item(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request), id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID requerido.' } };
    if (request.method === 'GET') {
      assertBbvaPermission(user, 'CATALOG_READ');
      const value = await service.get(id);
      return value ? { status: 200, jsonBody: { item: value } } : { status: 404, jsonBody: { error: 'Especialidad no encontrada.' } };
    }
    assertBbvaPermission(user, 'CATALOG_WRITE');
    const value = await service.update(id, await readBbvaJson(request), user.email);
    return value ? { status: 200, jsonBody: { item: value } } : { status: 404, jsonBody: { error: 'Especialidad no encontrada.' } };
  } catch (error) { return fail(error, context); }
}

async function status(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'CATALOG_WRITE');
    const value = await service.status(request.params.id, (await readBbvaJson(request))?.status, user.email);
    return value ? { status: 200, jsonBody: { item: value } } : { status: 404, jsonBody: { error: 'Especialidad no encontrada.' } };
  } catch (error) { return fail(error, context); }
}

app.http('bbvaEngineeringSpecialtyExplorer', { methods: ['GET'], authLevel: 'anonymous', route: 'bbva/engineering-specialty-explorer', handler: explorer });
app.http('bbvaEngineeringSpecialtyCollection', { methods: ['GET', 'POST'], authLevel: 'anonymous', route: 'bbva/engineering-specialties', handler: collection });
app.http('bbvaEngineeringSpecialtyItem', { methods: ['GET', 'PUT'], authLevel: 'anonymous', route: 'bbva/engineering-specialties/{id}', handler: item });
app.http('bbvaEngineeringSpecialtyStatus', { methods: ['PATCH'], authLevel: 'anonymous', route: 'bbva/engineering-specialties/{id}/status', handler: status });
