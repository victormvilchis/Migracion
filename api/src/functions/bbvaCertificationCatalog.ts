import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';
import type { CertificationCatalogListParams } from '../lib/bbvaCertificationCatalogDomain.js';
import { BbvaCertificationCatalogService } from '../lib/bbvaCertificationCatalogService.js';
import { readBbvaJson } from '../lib/bbvaHttp.js';

const service = new BbvaCertificationCatalogService();

function numberParam(request: HttpRequest, name: string, fallback: number): number {
  const value = Number(request.query.get(name));
  return Number.isFinite(value) ? value : fallback;
}

function errorResponse(error: unknown, context: InvocationContext): HttpResponseInit {
  const value = error as { message?: string; number?: number; statusCode?: number };
  const message = value?.message || String(error);
  context.error('[BBVA:CertificationCatalog] Error:', message);
  if (value.statusCode === 403) return { status: 403, jsonBody: { error: message } };
  if (value.statusCode === 409 || value.number === 547) return { status: 409, jsonBody: { error: message } };
  if (value.number === 2601 || value.number === 2627 || /duplicate|unique|duplicad/i.test(message)) {
    return { status: 409, jsonBody: { error: 'Ya existe una certificación con el mismo código o nombre.' } };
  }
  if (/obligatori|inválid|exceder|debe|seleccionad|vigencia|perfil|tecnología|grupo/i.test(message)) {
    return { status: 400, jsonBody: { error: message } };
  }
  return { status: 500, jsonBody: { error: 'No fue posible completar la operación del catálogo de certificaciones.' } };
}

export async function certificationCatalogCollectionHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    if (request.method === 'GET') {
      assertBbvaPermission(user, 'CERTIFICATION_CATALOG_READ');
      const params: CertificationCatalogListParams = {
        search: request.query.get('search') ?? '',
        status: (request.query.get('status') as CertificationCatalogListParams['status']) ?? 'ACTIVE',
        certificationType: (request.query.get('certificationType') as CertificationCatalogListParams['certificationType']) ?? 'ALL',
        page: numberParam(request, 'page', 0),
        size: numberParam(request, 'size', 10),
        sort: (request.query.get('sort') as CertificationCatalogListParams['sort']) ?? 'name',
        direction: (request.query.get('direction') as CertificationCatalogListParams['direction']) ?? 'asc',
      };
      return { status: 200, jsonBody: { ...(await service.list(params)), storage: 'sql-server' } };
    }
    if (request.method === 'POST') {
      assertBbvaPermission(user, 'CERTIFICATION_CATALOG_WRITE');
      const item = await service.create(await readBbvaJson(request), user.email);
      return { status: 201, jsonBody: { item, storage: 'sql-server' } };
    }
    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

export async function certificationCatalogItemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const user = getCurrentUser(request);

    if (request.method === 'GET') {
      assertBbvaPermission(user, 'CERTIFICATION_CATALOG_READ');
      const item = await service.get(id);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Certificación no encontrada.' } };
    }
    if (request.method === 'PUT') {
      assertBbvaPermission(user, 'CERTIFICATION_CATALOG_WRITE');
      const item = await service.update(id, await readBbvaJson(request), user.email);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Certificación no encontrada.' } };
    }
    if (request.method === 'DELETE') {
      assertBbvaPermission(user, 'CERTIFICATION_CATALOG_WRITE');
      const deleted = await service.delete(id, user.email);
      return deleted ? { status: 200, jsonBody: { deleted: true } } : { status: 404, jsonBody: { error: 'Certificación no encontrada.' } };
    }
    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

export async function certificationCatalogStatusHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'CERTIFICATION_CATALOG_WRITE');
    const body = await readBbvaJson(request);
    const item = await service.updateStatus(id, body?.status, user.email);
    return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Certificación no encontrada.' } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

export async function certificationCatalogOptionsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'CERTIFICATION_CATALOG_READ');
    return { status: 200, jsonBody: { items: await service.options(), storage: 'sql-server' } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

app.http('bbvaCertificationCatalogCollection', {
  methods: ['GET', 'POST'], authLevel: 'anonymous', route: 'bbva/certification-catalog', handler: certificationCatalogCollectionHandler,
});
app.http('bbvaCertificationCatalogOptions', {
  methods: ['GET'], authLevel: 'anonymous', route: 'bbva/certification-catalog-options', handler: certificationCatalogOptionsHandler,
});
app.http('bbvaCertificationCatalogItem', {
  methods: ['GET', 'PUT', 'DELETE'], authLevel: 'anonymous', route: 'bbva/certification-catalog/{id}', handler: certificationCatalogItemHandler,
});
app.http('bbvaCertificationCatalogStatus', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'bbva/certification-catalog/{id}/status', handler: certificationCatalogStatusHandler,
});
