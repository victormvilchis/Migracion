import { BbvaDashboardService } from './bbvaDashboardService.js';
import { bbvaBusinessDate } from './bbvaBusinessTime.js';

const dashboardService = new BbvaDashboardService();

export class BbvaDashboardSnapshotService {
  async capture(actorEmail = 'system.dashboard@basebfs.local') {
    // get() captura el snapshot global del día. El histórico se desactiva para
    // evitar una lectura innecesaria durante la tarea programada.
    const result = await dashboardService.get({}, actorEmail, { includeHistory: false, captureSnapshot: true });
    return {
      snapshotDate: bbvaBusinessDate(),
      cards: result.cards,
    };
  }
}
