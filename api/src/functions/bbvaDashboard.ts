import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';
import { bbvaErrorResponse } from '../lib/bbvaHttp.js';
import { BbvaDashboardService } from '../lib/bbvaDashboardService.js';

const service = new BbvaDashboardService();

export async function bbvaDashboardHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_READ');
    const params = request.query;
    const result = await service.get({
      technologyId: params.get('technologyId'),
      profileId: params.get('profileId'),
      certificationStatus: params.get('certificationStatus'),
      deliveryManager: params.get('deliveryManager'),
      talentType: params.get('talentType'),
      fromDate: params.get('fromDate'),
      toDate: params.get('toDate'),
      search: params.get('search'),
    }, user.email);
    return { status: 200, jsonBody: result };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'Dashboard');
  }
}

app.http('bbvaDashboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'bbva/dashboard',
  handler: bbvaDashboardHandler,
});
