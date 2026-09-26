import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { TalentService } from '../lib/bbvaTalentService.js';
import { TalentConversionService } from '../lib/bbvaTalentConversionService.js';
import { bbvaErrorResponse, readBbvaJson } from '../lib/bbvaHttp.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';

const service = new TalentService();
const conversionService = new TalentConversionService();

export async function talentCollectionHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, request.method === 'GET' ? 'TALENT_READ' : 'TALENT_WRITE');
    if (request.method === 'GET') return { status: 200, jsonBody: { items: await service.list(), storage: 'sql-server' } };
    if (request.method === 'POST') {
      const item = await service.create(await readBbvaJson(request), user.email);
      return { status: 201, jsonBody: { item, storage: 'sql-server' } };
    }
    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'TalentBank');
  }
}

export async function talentItemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, request.method === 'GET' ? 'TALENT_READ' : 'TALENT_WRITE');
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };

    if (request.method === 'GET') {
      const item = await service.get(id);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
    }

    if (request.method === 'PUT') {
      const item = await service.update(id, await readBbvaJson(request), user.email);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
    }

    if (request.method === 'DELETE') {
      const deleted = await service.delete(id);
      return deleted ? { status: 200, jsonBody: { deleted: true } } : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
    }

    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'TalentBank');
  }
}

export async function talentStageHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'TALENT_WRITE');
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const payload = await readBbvaJson(request);
    const item = await service.updateStage(id, payload?.stage, user.email);
    return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'TalentBank');
  }
}

export async function talentHistoryHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'TALENT_READ');
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const item = await service.get(id);
    if (!item) return { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
    return { status: 200, jsonBody: { items: await service.history(id) } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'TalentBank');
  }
}

export async function talentCvHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, request.method === 'GET' ? 'TALENT_READ' : 'TALENT_WRITE');
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };

    if (request.method === 'GET') {
      const document = await service.getCv(id);
      return document ? { status: 200, jsonBody: { document } } : { status: 404, jsonBody: { error: 'Este talento no tiene un CV registrado.' } };
    }

    if (request.method === 'PUT') {
      const item = await service.saveCv(id, await readBbvaJson(request), user.email);
      return item ? { status: 200, jsonBody: { cv: item.cv } } : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
    }

    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'TalentBank');
  }
}


export async function talentConvertHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'TALENT_WRITE');
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const result = await conversionService.convert(id, user.email);
    return result
      ? { status: 200, jsonBody: { collaboratorId: result.collaboratorId, message: 'El talento se convirtió correctamente en colaborador.' } }
      : { status: 404, jsonBody: { error: 'Registro de Talent Bank no encontrado.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'TalentBank');
  }
}

app.http('bbvaTalentBankCollection', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'bbva/talent-bank',
  handler: talentCollectionHandler,
});

app.http('bbvaTalentBankItem', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'bbva/talent-bank/{id}',
  handler: talentItemHandler,
});

app.http('bbvaTalentBankStage', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'bbva/talent-bank/{id}/stage',
  handler: talentStageHandler,
});

app.http('bbvaTalentBankHistory', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'bbva/talent-bank/{id}/history',
  handler: talentHistoryHandler,
});

app.http('bbvaTalentBankCv', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  route: 'bbva/talent-bank/{id}/cv',
  handler: talentCvHandler,
});


app.http('bbvaTalentBankConvert', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'bbva/talent-bank/{id}/convert',
  handler: talentConvertHandler,
});
