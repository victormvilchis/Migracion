import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CollaboratorService } from '../modules/collaborators/application/collaboratorService.js';

const service = new CollaboratorService();

function errorResponse(error: any, context: InvocationContext): HttpResponseInit {
  const message = error?.message || String(error);
  context.error('[Collaborators] Error:', message);
  return { status: 500, jsonBody: { error: 'No fue posible completar la operación de Colaboradores.', details: message } };
}

export async function collaboratorsCollectionHandler(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    return { status: 200, jsonBody: { items: await service.list(), storage: 'sql-server' } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

export async function collaboratorItemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'ID es requerido.' } };
    const item = await service.get(id);
    return item ? { status: 200, jsonBody: { item, storage: 'sql-server' } } : { status: 404, jsonBody: { error: 'Colaborador no encontrado.' } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

app.http('collaboratorsCollection', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'collaborators',
  handler: collaboratorsCollectionHandler,
});

app.http('collaboratorItem', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'collaborators/{id}',
  handler: collaboratorItemHandler,
});
