import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';
import { bbvaCatalogDefinitions, isBbvaCatalogType, type BbvaCatalogListParams } from '../lib/bbvaCatalogDomain.js';
import { BbvaCatalogService } from '../lib/bbvaCatalogService.js';
import { readBbvaJson } from '../lib/bbvaHttp.js';

const service = new BbvaCatalogService();

function responseForError(error: unknown, context: InvocationContext): HttpResponseInit {
  const value = error as { message?: string; number?: number; statusCode?: number };
  const message = value?.message || String(error);
  context.error('[BBVA:Catalogs] Error:', message);
  if (value.statusCode === 403) return { status: 403, jsonBody: { error: message } };
  if (value.statusCode === 409) return { status: 409, jsonBody: { error: message } };
  if (value.number === 547) return { status: 409, jsonBody: { error: 'No es posible eliminar el registro porque tiene dependencias activas.' } };
  if (value.number === 2601 || value.number === 2627 || /duplicate|unique|duplicad/i.test(message)) {
    return { status: 409, jsonBody: { error: 'Ya existe un registro equivalente en este catálogo.' } };
  }
  if (/obligatorio|inválid|exceder|estado|seniority/i.test(message)) return { status: 400, jsonBody: { error: message } };
  return { status: 500, jsonBody: { error: 'No fue posible completar la operación del catálogo.' } };
}

function resolveCatalog(request: HttpRequest) {
  const catalog = request.params.catalog;
  if (!isBbvaCatalogType(catalog)) return null;
  return bbvaCatalogDefinitions[catalog];
}

function numberParam(request: HttpRequest, name: string, fallback: number): number {
  const value = Number(request.query.get(name));
  return Number.isFinite(value) ? value : fallback;
}

export async function catalogCollectionHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const definition = resolveCatalog(request);
    if (!definition) return { status: 404, jsonBody: { error: 'Catálogo no reconocido.' } };
    const user = getCurrentUser(request);

    if (request.method === 'GET') {
      assertBbvaPermission(user, 'CATALOG_READ');
      const params: BbvaCatalogListParams = {
        search: request.query.get('search') ?? '',
        status: (request.query.get('status') as BbvaCatalogListParams['status']) ?? 'ACTIVE',
        page: numberParam(request, 'page', 0),
        size: numberParam(request, 'size', 10),
        sort: (request.query.get('sort') as BbvaCatalogListParams['sort']) ?? 'name',
        direction: (request.query.get('direction') as BbvaCatalogListParams['direction']) ?? 'asc',
      };
      return { status: 200, jsonBody: { ...(await service.list(definition, params)), storage: 'sql-server' } };
    }

    if (request.method === 'POST') {
      assertBbvaPermission(user, 'CATALOG_WRITE');
      const item = await service.create(definition, await readBbvaJson(request), user.email);
      return { status: 201, jsonBody: { item, storage: 'sql-server' } };
    }

    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return responseForError(error, context);
  }
}

export async function catalogOptionsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const definition = resolveCatalog(request);
    if (!definition) return { status: 404, jsonBody: { error: 'Catálogo no reconocido.' } };
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'CATALOG_READ');
    return { status: 200, jsonBody: { items: await service.options(definition), storage: 'sql-server' } };
  } catch (error) {
    return responseForError(error, context);
  }
}

export async function catalogItemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const definition = resolveCatalog(request);
    if (!definition) return { status: 404, jsonBody: { error: 'Catálogo no reconocido.' } };
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const user = getCurrentUser(request);

    if (request.method === 'GET') {
      assertBbvaPermission(user, 'CATALOG_READ');
      const item = await service.get(definition, id);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Registro no encontrado.' } };
    }

    if (request.method === 'PUT') {
      assertBbvaPermission(user, 'CATALOG_WRITE');
      const item = await service.update(definition, id, await readBbvaJson(request), user.email);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Registro no encontrado.' } };
    }

    if (request.method === 'DELETE') {
      assertBbvaPermission(user, 'CATALOG_WRITE');
      const deleted = await service.delete(definition, id);
      return deleted ? { status: 200, jsonBody: { deleted: true } } : { status: 404, jsonBody: { error: 'Registro no encontrado.' } };
    }

    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return responseForError(error, context);
  }
}

export async function catalogStatusHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const definition = resolveCatalog(request);
    if (!definition) return { status: 404, jsonBody: { error: 'Catálogo no reconocido.' } };
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'CATALOG_WRITE');
    const body = await readBbvaJson(request);
    const item = await service.updateStatus(definition, id, body?.status, user.email);
    return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Registro no encontrado.' } };
  } catch (error) {
    return responseForError(error, context);
  }
}

app.http('bbvaCatalogCollection', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'bbva/catalogs/{catalog}',
  handler: catalogCollectionHandler,
});

app.http('bbvaCatalogOptions', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'bbva/catalog-options/{catalog}',
  handler: catalogOptionsHandler,
});

app.http('bbvaCatalogItem', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'bbva/catalogs/{catalog}/{id}',
  handler: catalogItemHandler,
});

app.http('bbvaCatalogStatus', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'bbva/catalogs/{catalog}/{id}/status',
  handler: catalogStatusHandler,
});
