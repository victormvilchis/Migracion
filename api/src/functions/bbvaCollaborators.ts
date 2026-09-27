import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { CollaboratorService } from '../lib/bbvaCollaboratorService.js';
import { PersonLifecycleService } from '../lib/bbvaPersonLifecycleService.js';
import { bbvaErrorResponse, readBbvaJson } from '../lib/bbvaHttp.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';

const service = new CollaboratorService();
const lifecycleService = new PersonLifecycleService();

export async function collaboratorsCollectionHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, request.method === 'GET' ? 'COLLABORATOR_READ' : 'COLLABORATOR_WRITE');
    if (request.method === 'GET') return { status: 200, jsonBody: { items: await service.list(), storage: 'sql-server' } };
    if (request.method === 'POST') {
      const item = await service.create(await readBbvaJson(request), user.email);
      return { status: 201, jsonBody: { item, storage: 'sql-server' } };
    }
    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) { return bbvaErrorResponse(error, context, 'Collaborators'); }
}

export async function collaboratorItemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, request.method === 'GET' ? 'COLLABORATOR_READ' : 'COLLABORATOR_WRITE');
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    if (request.method === 'GET') {
      const item = await service.get(id);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Colaborador no encontrado.' } };
    }
    if (request.method === 'PUT') {
      const item = await service.update(id, await readBbvaJson(request), user.email);
      return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Colaborador no encontrado.' } };
    }
    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) { return bbvaErrorResponse(error, context, 'Collaborators'); }
}



export async function collaboratorLifecycleHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_READ');
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const items = await lifecycleService.collaboratorTimeline(id);
    return items
      ? { status: 200, jsonBody: { items } }
      : { status: 404, jsonBody: { error: 'Colaborador no encontrado.' } };
  } catch (error) { return bbvaErrorResponse(error, context, 'Collaborators'); }
}

export async function lifecycleReasonsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_READ');
    return { status: 200, jsonBody: { items: await lifecycleService.listReasons() } };
  } catch (error) { return bbvaErrorResponse(error, context, 'Collaborators'); }
}

export async function collaboratorMoveToTalentHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_WRITE');
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const result = await lifecycleService.moveCollaboratorToTalent(id, await readBbvaJson(request), user.email);
    return result
      ? { status: 200, jsonBody: { ...result, message: 'El colaborador se movió correctamente a Banco de talento.' } }
      : { status: 404, jsonBody: { error: 'Colaborador no encontrado.' } };
  } catch (error) { return bbvaErrorResponse(error, context, 'Collaborators'); }
}

app.http('bbvaCollaboratorsCollection', { methods: ['GET', 'POST'], authLevel: 'anonymous', route: 'bbva/collaborators', handler: collaboratorsCollectionHandler });
app.http('bbvaCollaboratorItem', { methods: ['GET', 'PUT'], authLevel: 'anonymous', route: 'bbva/collaborators/{id}', handler: collaboratorItemHandler });

app.http('bbvaCollaboratorLifecycle', { methods: ['GET'], authLevel: 'anonymous', route: 'bbva/collaborators/{id}/lifecycle', handler: collaboratorLifecycleHandler });
app.http('bbvaLifecycleReasons', { methods: ['GET'], authLevel: 'anonymous', route: 'bbva/lifecycle/reasons', handler: lifecycleReasonsHandler });
app.http('bbvaCollaboratorMoveToTalent', { methods: ['POST'], authLevel: 'anonymous', route: 'bbva/collaborators/{id}/move-to-talent', handler: collaboratorMoveToTalentHandler });
