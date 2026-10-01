import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';
import { bbvaErrorResponse, readBbvaJson } from '../lib/bbvaHttp.js';
import { CollaboratorCertificationService } from '../lib/bbvaCollaboratorCertificationService.js';
import { CertificationCommunicationService } from '../lib/bbvaCertificationCommunicationService.js';

const service = new CollaboratorCertificationService();
const communicationService = new CertificationCommunicationService();

export async function collaboratorCertificationCollectionHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, request.method === 'GET' ? 'COLLABORATOR_READ' : 'COLLABORATOR_WRITE');
    const collaboratorId = request.params.id;
    if (!collaboratorId) return { status: 400, jsonBody: { error: 'ID de colaborador requerido.' } };

    if (request.method === 'GET') {
      const result = await service.list(collaboratorId, user.email);
      return result ? { status: 200, jsonBody: result } : { status: 404, jsonBody: { error: 'Colaborador no encontrado.' } };
    }
    if (request.method === 'POST') {
      const item = await service.addManual(collaboratorId, await readBbvaJson(request), user.email);
      return item ? { status: 201, jsonBody: { item } } : { status: 404, jsonBody: { error: 'Colaborador no encontrado.' } };
    }
    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'CollaboratorCertifications');
  }
}

export async function collaboratorCertificationItemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, request.method === 'GET' ? 'COLLABORATOR_READ' : 'COLLABORATOR_WRITE');
    const collaboratorId = request.params.id;
    const recordId = request.params.certificationRecordId;
    if (!collaboratorId || !recordId) return { status: 400, jsonBody: { error: 'Identificadores requeridos.' } };

    if (request.method === 'GET') {
      const item = await service.get(collaboratorId, recordId);
      return item ? { status: 200, jsonBody: item } : { status: 404, jsonBody: { error: 'Certificación del colaborador no encontrada.' } };
    }
    if (request.method === 'PUT') {
      const item = await service.update(collaboratorId, recordId, await readBbvaJson(request), user.email);
      return item ? { status: 200, jsonBody: { item } } : { status: 404, jsonBody: { error: 'Certificación del colaborador no encontrada.' } };
    }
    if (request.method === 'DELETE') {
      const item = await service.markNotApplicable(collaboratorId, recordId, user.email);
      return item ? { status: 200, jsonBody: { item } } : { status: 404, jsonBody: { error: 'Certificación del colaborador no encontrada.' } };
    }
    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'CollaboratorCertifications');
  }
}

export async function collaboratorCertificationCoverageHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_WRITE');
    const collaboratorId = request.params.id;
    const recordId = request.params.certificationRecordId;
    if (!collaboratorId || !recordId) return { status: 400, jsonBody: { error: 'Identificadores requeridos.' } };
    if (request.method !== 'PUT') return { status: 405, jsonBody: { error: 'Método no permitido.' } };
    const item = await service.updateCoverage(collaboratorId, recordId, await readBbvaJson(request), user.email);
    return item ? { status: 200, jsonBody: { item } } : { status: 404, jsonBody: { error: 'Certificación del colaborador no encontrada.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'CollaboratorCertifications');
  }
}

export async function collaboratorCertificationAttemptHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_WRITE');
    const collaboratorId = request.params.id;
    const recordId = request.params.certificationRecordId;
    if (!collaboratorId || !recordId) return { status: 400, jsonBody: { error: 'Identificadores requeridos.' } };
    const result = await service.addAttempt(collaboratorId, recordId, await readBbvaJson(request), user.email);
    return result ? { status: 201, jsonBody: result } : { status: 404, jsonBody: { error: 'Certificación del colaborador no encontrada.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'CollaboratorCertifications');
  }
}


export async function collaboratorCertificationAttemptItemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user=getCurrentUser(request);assertBbvaPermission(user,'COLLABORATOR_WRITE');
    const collaboratorId=request.params.id,recordId=request.params.certificationRecordId,attemptId=request.params.attemptId;
    if(!collaboratorId||!recordId||!attemptId)return{status:400,jsonBody:{error:'Identificadores requeridos.'}};
    if(request.method!=='PUT')return{status:405,jsonBody:{error:'Método no permitido.'}};
    const result=await service.updateAttempt(collaboratorId,recordId,attemptId,await readBbvaJson(request),user.email);
    return result?{status:200,jsonBody:result}:{status:404,jsonBody:{error:'Intento no encontrado.'}};
  } catch(error){return bbvaErrorResponse(error,context,'CollaboratorCertifications');}
}

export async function collaboratorCertificationCriticalResolutionHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_WRITE');
    const collaboratorId = request.params.id;
    const recordId = request.params.certificationRecordId;
    if (!collaboratorId || !recordId) return { status: 400, jsonBody: { error: 'Identificadores requeridos.' } };
    const item = await service.resolveCritical(collaboratorId, recordId, await readBbvaJson(request), user.email);
    return item ? { status: 200, jsonBody: { item } } : { status: 404, jsonBody: { error: 'Certificación del colaborador no encontrada.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'CollaboratorCertifications');
  }
}

export async function collaboratorCertificationRecertifyHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_WRITE');
    const collaboratorId = request.params.id;
    const recordId = request.params.certificationRecordId;
    if (!collaboratorId || !recordId) return { status: 400, jsonBody: { error: 'Identificadores requeridos.' } };
    const item = await service.recertify(collaboratorId, recordId, user.email);
    return item ? { status: 200, jsonBody: { item } } : { status: 404, jsonBody: { error: 'Certificación del colaborador no encontrada.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'CollaboratorCertifications');
  }
}


export async function certificationTrackingHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_READ');
    return { status: 200, jsonBody: await service.tracking() };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'CollaboratorCertifications');
  }
}


export async function collaboratorCertificationCommunicationHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, request.method === 'GET' ? 'COLLABORATOR_READ' : 'COLLABORATOR_WRITE');
    const collaboratorId = request.params.id;
    const recordId = request.params.certificationRecordId;
    const communicationId = request.params.communicationId;
    if (!collaboratorId || !recordId) return { status: 400, jsonBody: { error: 'Identificadores requeridos.' } };

    if (request.method === 'POST' && !communicationId) {
      const item = await communicationService.generate(collaboratorId, recordId, await readBbvaJson(request), user.email);
      return item ? { status: 201, jsonBody: { item } } : { status: 404, jsonBody: { error: 'No se encontró el intento solicitado.' } };
    }
    if (request.method === 'GET' && communicationId) {
      const item = await communicationService.get(collaboratorId, recordId, communicationId, user.email);
      return item ? { status: 200, jsonBody: { item } } : { status: 404, jsonBody: { error: 'Comunicación no encontrada.' } };
    }
    return { status: 405, jsonBody: { error: 'Método no permitido.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'CollaboratorCertifications');
  }
}

export async function collaboratorCertificationCommunicationEmailHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_WRITE');
    const collaboratorId = request.params.id;
    const recordId = request.params.certificationRecordId;
    const communicationId = request.params.communicationId;
    if (!collaboratorId || !recordId || !communicationId) return { status: 400, jsonBody: { error: 'Identificadores requeridos.' } };
    const item = await communicationService.prepareEmail(collaboratorId, recordId, communicationId, await readBbvaJson(request), user.email);
    return item ? { status: 200, jsonBody: { item } } : { status: 404, jsonBody: { error: 'Comunicación no encontrada.' } };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'CollaboratorCertifications');
  }
}

app.http('bbvaCollaboratorCertificationCollection', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'bbva/collaborators/{id}/certifications',
  handler: collaboratorCertificationCollectionHandler,
});

app.http('bbvaCollaboratorCertificationItem', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'bbva/collaborators/{id}/certifications/{certificationRecordId}',
  handler: collaboratorCertificationItemHandler,
});

app.http('bbvaCollaboratorCertificationCoverage', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'bbva/collaborators/{id}/certifications/{certificationRecordId}/coverage',
  handler: collaboratorCertificationCoverageHandler,
});

app.http('bbvaCollaboratorCertificationAttempt', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'bbva/collaborators/{id}/certifications/{certificationRecordId}/attempts',
  handler: collaboratorCertificationAttemptHandler,
});

app.http('bbvaCollaboratorCertificationAttemptItem',{methods:['PUT'],authLevel:'anonymous',route:'bbva/collaborators/{id}/certifications/{certificationRecordId}/attempts/{attemptId}',handler:collaboratorCertificationAttemptItemHandler});

app.http('bbvaCollaboratorCertificationRecertify', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'bbva/collaborators/{id}/certifications/{certificationRecordId}/recertify',
  handler: collaboratorCertificationRecertifyHandler,
});

app.http('bbvaCollaboratorCertificationCriticalResolution', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'bbva/collaborators/{id}/certifications/{certificationRecordId}/critical-resolution',
  handler: collaboratorCertificationCriticalResolutionHandler,
});

app.http('bbvaCertificationTracking', { methods: ['GET'], authLevel: 'anonymous', route: 'bbva/certifications/tracking-items', handler: certificationTrackingHandler });

app.http('bbvaCollaboratorCertificationCommunication', { methods: ['GET','POST'], authLevel: 'anonymous', route: 'bbva/collaborators/{id}/certifications/{certificationRecordId}/communications/{communicationId?}', handler: collaboratorCertificationCommunicationHandler });
app.http('bbvaCollaboratorCertificationCommunicationEmail', { methods: ['POST'], authLevel: 'anonymous', route: 'bbva/collaborators/{id}/certifications/{certificationRecordId}/communications/{communicationId}/email', handler: collaboratorCertificationCommunicationEmailHandler });
