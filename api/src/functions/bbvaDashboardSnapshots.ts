import { app, HttpRequest, HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';
import { bbvaErrorResponse } from '../lib/bbvaHttp.js';
import { BbvaDashboardSnapshotService } from '../lib/bbvaDashboardSnapshotService.js';

const service = new BbvaDashboardSnapshotService();

app.timer('bbvaDashboardDailySnapshot', {
  // 05:55 UTC = 23:55 de México centro. Captura el cierre operativo del día
  // sin depender del cambio de fecha UTC. El GET global también hace upsert.
  schedule: '0 55 5 * * *',
  useMonitor: true,
  handler: async (_timer: Timer, context: InvocationContext) => {
    try {
      const result = await service.capture();
      context.log(`[BBVA:DashboardSnapshot] Snapshot ${result.snapshotDate} actualizado.`);
    } catch (error) {
      context.error('[BBVA:DashboardSnapshot] Error al capturar histórico KPI.', error);
      throw error;
    }
  },
});

export async function bbvaDashboardSnapshotCaptureHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'COLLABORATOR_WRITE');
    const result = await service.capture(user.email);
    return { status: 200, jsonBody: result };
  } catch (error) {
    return bbvaErrorResponse(error, context, 'Dashboard');
  }
}

app.http('bbvaDashboardSnapshotCapture', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'bbva/dashboard/snapshots/capture',
  handler: bbvaDashboardSnapshotCaptureHandler,
});
