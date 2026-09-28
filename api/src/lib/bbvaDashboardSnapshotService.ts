import { BbvaDashboardService } from './bbvaDashboardService.js';
import { bbvaBusinessDate } from './bbvaBusinessTime.js';

const dashboardService = new BbvaDashboardService();

export class BbvaDashboardSnapshotService {
  async capture(actorEmail = 'system.dashboard@basebfs.local') {
    // La captura es explícita: los GET normales del Dashboard permanecen de solo lectura.
    // El histórico se desactiva para evitar una lectura innecesaria durante la tarea programada.
    const result = await dashboardService.get({}, actorEmail, { includeHistory: false, captureSnapshot: true });
    return {
      snapshotDate: bbvaBusinessDate(),
      cards: result.cards,
    };
  }
}
