import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { CollaboratorService } from '../lib/bbvaCollaboratorService.js';
import { bbvaErrorResponse, readBbvaJson } from '../lib/bbvaHttp.js';

const service = new CollaboratorService();

export async function collaboratorsCollectionHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (request.method === 'GET') return { status: 200, jsonBody: { items: await service.list(), storage: 'sql-server' } };
    if (request.method === 'POST') {
      const user = getCurrentUser(request);
      const item = await service.create(await readBbvaJson(request), user.email);
      return { status: 201, jsonBody: { item, storage: 'sql-server' } };
    }
    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) { return bbvaErrorResponse(error, context, 'Collaborators'); }
}

export async function collaboratorItemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    if (request.method === 'GET') {
      const item = await service.get(id);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Colaborador no encontrado.' } };
    }
    if (request.method === 'PUT') {
      const user = getCurrentUser(request);
      const item = await service.update(id, await readBbvaJson(request), user.email);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Colaborador no encontrado.' } };
    }
    if (request.method === 'DELETE') {
      const deleted = await service.delete(id);
      return deleted ? { status: 200, jsonBody: { deleted: true } } : { status: 404, jsonBody: { error: 'Colaborador no encontrado.' } };
    }
    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) { return bbvaErrorResponse(error, context, 'Collaborators'); }
}

app.http('bbvaCollaboratorsCollection', { methods: ['GET', 'POST'], authLevel: 'anonymous', route: 'bbva/collaborators', handler: collaboratorsCollectionHandler });
app.http('bbvaCollaboratorItem', { methods: ['GET', 'PUT', 'DELETE'], authLevel: 'anonymous', route: 'bbva/collaborators/{id}', handler: collaboratorItemHandler });
