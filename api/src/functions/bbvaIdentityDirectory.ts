import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';
import { BbvaIdentityDirectoryService } from '../lib/bbvaIdentityDirectoryService.js';

const service = new BbvaIdentityDirectoryService();

function errorResponse(error: unknown, context: InvocationContext): HttpResponseInit {
  const value = error as { message?: string; statusCode?: number };
  const message = value?.message || String(error);
  context.error('[BBVA:IdentityDirectory] Error:', message);
  const status = value.statusCode && [400, 403, 404, 501].includes(value.statusCode) ? value.statusCode : 500;
  return { status, jsonBody: { error: status === 500 ? 'No fue posible consultar el directorio de IS.' : message } };
}

export async function identityDirectoryLookupHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'IDENTITY_DIRECTORY_READ');
    const isValue = request.params.is;
    if (!isValue) return { status: 400, jsonBody: { error: 'El IS es obligatorio.' } };
    return { status: 200, jsonBody: { item: await service.lookup(isValue), storage: 'external-directory' } };
  } catch (error) {
    return errorResponse(error, context);
  }
}

app.http('bbvaIdentityDirectoryLookup', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'bbva/identity-directory/{is}',
  handler: identityDirectoryLookupHandler,
});
