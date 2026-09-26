import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CollaboratorService } from '../lib/bbvaCollaboratorService.js';
import { bbvaErrorResponse } from '../lib/bbvaHttp.js';

const service = new CollaboratorService();

export async function collaboratorsCollectionHandler(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    return { status: 200, jsonBody: { items: await service.list(), storage: 'sql-server' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'Collaborators');
  }
}

export async function collaboratorItemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const item = await service.get(id);
    return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Colaborador no encontrado.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'Collaborators');
  }
}

app.http('bbvaCollaboratorsCollection', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'bbva/collaborators',
  handler: collaboratorsCollectionHandler,
});

app.http('bbvaCollaboratorItem', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'bbva/collaborators/{id}',
  handler: collaboratorItemHandler,
});
