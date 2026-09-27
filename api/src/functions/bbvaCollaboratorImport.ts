import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';
import { bbvaErrorResponse, readBbvaJson } from '../lib/bbvaHttp.js';
import { CollaboratorImportService } from '../lib/bbvaCollaboratorImportService.js';
import type { ImportApplyRequest, ImportPreviewRequest } from '../lib/bbvaCollaboratorImportDomain.js';

const service = new CollaboratorImportService();

export async function collaboratorImportPreviewHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_WRITE');
    const payload = await readBbvaJson(request) as unknown as ImportPreviewRequest;
    return { status: 200, jsonBody: await service.preview(payload) };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'CollaboratorImport');
  }
}

export async function collaboratorImportApplyHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_WRITE');
    const payload = await readBbvaJson(request) as unknown as ImportApplyRequest;
    return { status: 200, jsonBody: await service.apply(payload, user.email) };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'CollaboratorImport');
  }
}

app.http('bbvaCollaboratorImportPreview', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'bbva/collaborators/import/preview',
  handler: collaboratorImportPreviewHandler,
});

app.http('bbvaCollaboratorImportApply', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'bbva/collaborators/import/apply',
  handler: collaboratorImportApplyHandler,
});
