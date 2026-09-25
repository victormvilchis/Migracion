import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbConnection } from '../lib/db.js';
import { getAiProviderInfo } from '../lib/azureOpenAiService.js';
import { getCurrentUser } from '../lib/authzLocal.js';

export async function healthHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const user = getCurrentUser(request);
  let dbStatus = 'disconnected';
  let dbError: string | null = null;

  try {
    const pool = await getDbConnection({ maxRetries: 1, retryDelayMs: 500 });
    const result = await pool.request().query('SELECT 1 AS alive');
    if (result.recordset[0]?.alive === 1) {
      dbStatus = 'connected';
    }
  } catch (err: any) {
    dbStatus = 'error';
    dbError = err?.message || 'Error de conexión a SQL Server';
  }

  const aiInfo = getAiProviderInfo();

  return {
    status: 200,
    jsonBody: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      user: {
        email: user.email,
        name: user.name,
      },
      services: {
        azureFunctions: 'running',
        sqlServer: {
          status: dbStatus,
          error: dbError,
        },
        ai: {
          provider: aiInfo.provider,
          configured: aiInfo.configured,
          mockMode: aiInfo.mockMode,
          model: aiInfo.model,
          gatewayUrl: aiInfo.baseUrl || null,
        },
      },
    },
  };
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthHandler,
});
