import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHistory, buildRecommendations } from '../dist/lib/bbvaDashboardService.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const cards = {
  collaboratorsActive: 100,
  talentBankActive: 20,
  certificationsApplicable: 200,
  coveragePercent: 80,
  expiring: 10,
  expired: 8,
  recertificationPending: 2,
  pending: 15,
  deliveryManagersRepresented: 6,
  dataQualityPending: 4,
  vendorReadyPercent: 75,
  vendorPending: 25,
  vendorExitRequired: 0,
};
const older = { snapshotDate:'2026-09-21', capturedAt:'2026-09-21T12:00:00Z', ...cards, coveragePercent:85, expired:5, vendorReadyPercent:80 };
const today = { snapshotDate:'2026-09-28', capturedAt:'2026-09-28T12:00:00Z', ...cards };
const history = buildHistory(cards, [older,today], '2026-09-28', 7, 90);
assert.equal(history.available, true);
assert.equal(history.previousSnapshotDate, '2026-09-21');
assert.equal(history.comparisons.coveragePercent?.delta, -5);
assert.equal(history.comparisons.expired?.delta, 3);
assert.equal(history.comparisonTargetDate, '2026-09-21');

const insufficient = buildHistory(cards, [today], '2026-09-28', 30, 90);
assert.equal(insufficient.available, false);
assert.equal(insufficient.previousSnapshotDate, null);
assert.equal(insufficient.comparisons.coveragePercent, undefined);

const recommendations = buildRecommendations(cards, [], {
  calendarName:'BBVA Vendors 2026', currentCode:'Q3', targetCode:'Q4', targetStartDate:'2026-09-28', targetEndDate:'2026-12-27', daysToTargetStart:0,
  readyCollaborators:75,pendingCollaborators:25,exhaustedAttemptCollaborators:0,readinessPercent:75,
}, history);
assert.ok(recommendations.some((item) => item.id === 'coverage-decline' && item.target === 'REPORTS'));
assert.match(read('api/src/lib/bbvaDashboardService.ts'), /id: 'expired-increase'/);

const repository = read('api/src/lib/bbvaDashboardRepository.ts');
assert.match(repository, /async recentActivity/);
assert.match(repository, /FROM bbva\.CollaboratorHistory/);
assert.match(repository, /FROM bbva\.TalentHistory/);
assert.match(repository, /FROM bbva\.PersonCertificationHistory/);
assert.match(repository, /h\.EventType<>N'IMPORTED_RECONCILIATION'/);

const reports = read('src/pagesBBVATalent/reports/BBVAReportsPage.tsx');
assert.match(reports, /Reporte de talento/);
assert.match(reports, /Reporte de colaboradores/);
assert.match(reports, /Reporte de certificaciones/);
assert.match(reports, /Exportar CSV/);
assert.match(reports, /BBVAHistoricalMetricPanel/);
assert.match(reports, /BBVAActivityFeed/);

const app = read('src/App.tsx');
assert.match(app, /\/bbva\/reports\/talent/);
assert.match(app, /\/bbva\/reports\/collaborators/);
assert.match(app, /\/bbva\/reports\/certifications/);
const navigation = read('src/componentsBBVATalent/bbvaNavigation.ts');
assert.match(navigation, /reports-talent[\s\S]*status: 'ready'/);
assert.match(navigation, /reports-collaborators[\s\S]*status: 'ready'/);
assert.match(navigation, /reports-certifications[\s\S]*status: 'ready'/);

const talent = read('src/pagesBBVATalent/talentBank/TalentBankPage.tsx');
assert.match(talent, /setExpanded\(isExpanded\?null:item\.id\)/);
assert.match(talent, /Clic para ver contexto de Banco de talento/);
assert.match(talent, /Usuario BBVA \/ XM/);
assert.match(talent, /Correo BBVA/);

const migration = read('api/scripts/migrate-bbva-analytics-v20.sql');
assert.match(migration, /IX_BBVA_CollaboratorHistory_CreatedAt/);
assert.match(migration, /IX_BBVA_TalentHistory_CreatedAt/);
assert.match(migration, /IX_BBVA_PersonCertificationHistory_CreatedAt/);

console.log('Analytics V20: OK');
console.log('- comparación histórica seleccionable sin tendencias ficticias: OK');
console.log('- recomendaciones evolutivas determinísticas: OK');
console.log('- actividad reciente desde historiales reales: OK');
console.log('- reportes Talento / Colaboradores / Certificaciones: OK');
console.log('- Banco de talento con expansión como Colaboradores: OK');
