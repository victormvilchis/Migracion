import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { TalentService } from '../modules/talent/application/talentService.js';

const service = new TalentService();

function errorResponse(error: any, context: InvocationContext): HttpResponseInit {
  const message = error?.message || 'Error interno al procesar Talent.';
  const sqlCode = Number(error?.number || error?.originalError?.info?.number || 0);

  if (sqlCode === 2601 || sqlCode === 2627) {
    return { status: 409, jsonBody: { error: 'Ya existe un registro de Talent con ese email.' } };
  }

  if (
    message.includes('requerido') ||
    message.includes('inválid') ||
    message.includes('formato') ||
    message.includes('permitidos')
  ) {
    return { status: 400, jsonBody: { error: message } };
  }

  context.error('[talent] Error:', error);
  return { status: 500, jsonBody: { error: 'Error interno al procesar Talent.' } };
}

async function readJson(request: HttpRequest): Promise<any> {
  try {
    return await request.json();
  } catch {
    throw new Error('Payload JSON inválido.');
  }
}

export async function talentCollectionHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);

    if (request.method === 'GET') {
      return { status: 200, jsonBody: { items: await service.list(), storage: 'sql-server' } };
    }

    if (request.method === 'POST') {
      const item = await service.create(await readJson(request), user.email);
      return { status: 201, jsonBody: { item, storage: 'sql-server' } };
    }

    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error: any) {
    return errorResponse(error, context);
  }
}

export async function talentItemHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };

    if (request.method === 'GET') {
      const item = await service.get(id);
      return item
        ? { status: 200, jsonBody: { item, storage: 'sql-server' } }
        : { status: 404, jsonBody: { error: 'Registro de Talent no encontrado.' } };
    }

    if (request.method === 'PUT') {
      const user = getCurrentUser(request);
      const item = await service.update(id, await readJson(request), user.email);
      return item
        ? { status: 200, jsonBody: { item, storage: 'sql-server' } }
        : { status: 404, jsonBody: { error: 'Registro de Talent no encontrado.' } };
    }

    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error: any) {
    return errorResponse(error, context);
  }
}

export async function talentStageHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };

    const user = getCurrentUser(request);
    const payload = await readJson(request);
    const item = await service.updateStage(id, payload?.stage, user.email);

    return item
      ? { status: 200, jsonBody: { item, storage: 'sql-server' } }
      : { status: 404, jsonBody: { error: 'Registro de Talent no encontrado.' } };
  } catch (error: any) {
    return errorResponse(error, context);
  }
}

app.http('talentCollection', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'talent',
  handler: talentCollectionHandler,
});

app.http('talentItem', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  route: 'talent/{id}',
  handler: talentItemHandler,
});

app.http('talentStage', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'talent/{id}/stage',
  handler: talentStageHandler,
});
