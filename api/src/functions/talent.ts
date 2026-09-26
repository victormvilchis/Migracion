import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { TalentService } from '../modules/talent/application/talentService.js';

const service = new TalentService();

async function readJson(request: HttpRequest): Promise<any> {
  try {
    return await request.json();
  } catch {
    throw new Error('El cuerpo de la solicitud debe ser JSON válido.');
  }
}

function errorResponse(error: any, context: InvocationContext): HttpResponseInit {
  const message = error?.message || String(error);
  context.error('[TalentBank] Error:', message);

  const duplicate = error?.number === 2601 || error?.number === 2627 || /duplicate|unique|duplicad/i.test(message);
  if (duplicate) {
    return { status: 409, jsonBody: { error: 'Ya existe una persona con el mismo correo, Código Softtek o Usuario corporativo.' } };
  }

  if (/obligatorio|inválid|formato|permitid|vencimiento|conversión/i.test(message)) {
    return { status: 400, jsonBody: { error: message } };
  }

  return { status: 500, jsonBody: { error: 'No fue posible completar la operación de Talent Bank.', details: message } };
}

export async function talentCollectionHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    if (request.method === 'GET') return { status: 200, jsonBody: { items: await service.list(), storage: 'sql-server' } };
    if (request.method === 'POST') {
      const item = await service.create(await readJson(request), user.email);
      return { status: 201, jsonBody: { item, storage: 'sql-server' } };
    }
    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

export async function talentItemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };

    if (request.method === 'GET') {
      const item = await service.get(id);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
    }

    if (request.method === 'PUT') {
      const user = getCurrentUser(request);
      const item = await service.update(id, await readJson(request), user.email);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
    }

    if (request.method === 'DELETE') {
      const deleted = await service.delete(id);
      return deleted ? { status: 200, jsonBody: { deleted: true } } : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
    }

    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

export async function talentStageHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const user = getCurrentUser(request);
    const payload = await readJson(request);
    const item = await service.updateStage(id, payload?.stage, user.email);
    return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

export async function talentHistoryHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const item = await service.get(id);
    if (!item) return { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
    return { status: 200, jsonBody: { items: await service.history(id) } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

export async function talentCvHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };

    if (request.method === 'GET') {
      const document = await service.getCv(id);
      return document ? { status: 200, jsonBody: { document } } : { status: 404, jsonBody: { error: 'Este talento no tiene un CV registrado.' } };
    }

    if (request.method === 'PUT') {
      const user = getCurrentUser(request);
      const item = await service.saveCv(id, await readJson(request), user.email);
      return item ? { status: 200, jsonBody: { cv: item.cv } } : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
    }

    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return errorResponse(error, context);
  }
}


export async function talentConvertHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const user = getCurrentUser(request);
    const result = await service.convertToCollaborator(id, user.email);
    return result
      ? { status: 200, jsonBody: { collaboratorId: result.collaboratorId, message: 'El talento se convirtió correctamente en colaborador.' } }
      : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
  } catch (error) {
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
  methods: ['GET', 'PUT', 'DELETE'],
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

app.http('talentHistory', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'talent/{id}/history',
  handler: talentHistoryHandler,
});

app.http('talentCv', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  route: 'talent/{id}/cv',
  handler: talentCvHandler,
});


app.http('talentConvert', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'talent/{id}/convert',
  handler: talentConvertHandler,
});
