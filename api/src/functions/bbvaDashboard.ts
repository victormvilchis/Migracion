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
      technologyProfile: params.get('technologyProfile'),
      certificationId: params.get('certificationId'),
      bbvaStructureLevel2: params.get('bbvaStructureLevel2'),
      certificationStatus: params.get('certificationStatus'),
      deliveryManager: params.get('deliveryManager'),
      talentType: params.get('talentType'),
      fromDate: params.get('fromDate'),
      toDate: params.get('toDate'),
      search: params.get('search'),
    }, user.email, {
      historyDays: Number(params.get('historyDays') || 90),
      comparisonDays: Number(params.get('comparisonDays') || 1),
      activityDays: Number(params.get('activityDays') || 30),
      activityLimit: Number(params.get('activityLimit') || 12),
    });
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
