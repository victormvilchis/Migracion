import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, '..');
const root = path.resolve(apiDir, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function collectSourceFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...collectSourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) result.push(full);
  }
  return result;
}

const distRules = path.join(apiDir, 'dist/lib/bbvaCertificationRules.js');
const distCalendar = path.join(apiDir, 'dist/lib/bbvaVendorCalendar.js');
const distBusinessTime = path.join(apiDir, 'dist/lib/bbvaBusinessTime.js');
const distCommunication = path.join(apiDir, 'dist/lib/bbvaCertificationCommunicationDomain.js');
for (const required of [distRules, distCalendar, distBusinessTime, distCommunication]) {
  assert.ok(fs.existsSync(required), `Falta ${required}. Ejecuta npm run build en api antes de esta prueba.`);
}

const rules = await import(pathToFileURL(distRules));
const calendar = await import(pathToFileURL(distCalendar));
const businessTime = await import(pathToFileURL(distBusinessTime));
const communication = await import(pathToFileURL(distCommunication));

// Regla crítica 2/2: sólo tipos definidos, máximo exactamente 2 y último resultado FAILED.
for (const certificationType of ['DEVELOPMENT_SECURITY', 'TECHNOLOGICAL', 'NORMATIVE_TESTING']) {
  assert.equal(rules.isCriticalTwoAttemptExhausted({ certificationType, maxAttempts: 2, attemptCount: 2, latestAttemptResult: 'FAILED' }), true);
}
assert.equal(rules.isCriticalTwoAttemptExhausted({ certificationType: 'COMPLIANCE', maxAttempts: 2, attemptCount: 2, latestAttemptResult: 'FAILED' }), false);
assert.equal(rules.isCriticalTwoAttemptExhausted({ certificationType: 'TECHNOLOGICAL', maxAttempts: 3, attemptCount: 2, latestAttemptResult: 'FAILED' }), false);
assert.equal(rules.isCriticalTwoAttemptExhausted({ certificationType: 'TECHNOLOGICAL', maxAttempts: 2, attemptCount: 2, latestAttemptResult: 'APPROVED' }), false);
assert.equal(rules.isCriticalResolutionOpen(null), true);
assert.equal(rules.isCriticalResolutionOpen('PENDING_REVIEW'), true);
assert.equal(rules.isCriticalResolutionOpen('LOW_REQUESTED'), true);
assert.equal(rules.isCriticalResolutionOpen('INTERN'), false);
assert.equal(rules.isCriticalResolutionOpen('LOW_CONFIRMED'), false);

// Cobertura: próxima a vencer sigue cubierta; vencida/pending no.
assert.equal(rules.isCertificationCovered('VALID'), true);
assert.equal(rules.isCertificationCovered('EXPIRING'), true);
assert.equal(rules.isCertificationCovered('EXPIRED'), false);
assert.equal(rules.isCertificationCovered('PENDING'), false);

// Preparación Q: una EXPIRING es válida sólo si su vigencia alcanza el inicio del Q objetivo.
assert.equal(rules.isCertificationReadyForTarget('EXPIRING', '2026-10-15', '2026-09-28'), true);
assert.equal(rules.isCertificationReadyForTarget('EXPIRING', '2026-09-27', '2026-09-28'), false);
assert.equal(rules.isCertificationReadyForTarget('VALID', null, '2026-09-28'), true);
assert.equal(rules.isCertificationReadyForTarget('FAILED', '2026-12-31', '2026-09-28'), false);

// BBVA México: 04:30 UTC del 28 todavía es 27 de septiembre en México.
const mexicoLateNight = new Date('2026-09-28T04:30:00.000Z');
assert.equal(businessTime.bbvaBusinessDate(mexicoLateNight), '2026-09-27');
const q3Close = calendar.vendorQuarterContext(mexicoLateNight);
assert.equal(q3Close.currentQuarter?.code, '2026Q3');
assert.equal(q3Close.targetQuarter?.code, '2026Q4');
assert.equal(q3Close.daysToTargetStart, 4);
const q4Start = calendar.vendorQuarterContext(new Date('2026-09-28T07:00:00.000Z'));
assert.equal(q4Start.currentQuarter?.code, '2026Q3');
assert.equal(q4Start.targetQuarter?.code, '2026Q4');
assert.equal(q4Start.daysToTargetStart, 3);

// La postal LOW sólo existe después de que el ciclo de vida confirme realmente la baja.
const baseCommunication = {
  collaboratorId: 'c', certificationRecordId: 'pc', certificationId: 'cert', certificationName: 'Desarrollo Seguro',
  certificationType: 'DEVELOPMENT_SECURITY', technologyName: null, fullName: 'Persona', firstName: 'Persona',
  recipientEmail: 'persona@softtek.com', currentCycle: 1, maxAttempts: 2, baseStatus: 'FAILED', attemptId: 'a2',
  attemptNumber: 2, attemptDate: '2026-09-27', result: 'FAILED', score10: null,
};
assert.equal(communication.resolveCommunicationContext({ ...baseCommunication, criticalResolutionStatus: 'PENDING_REVIEW' }), 'LAST_FAILED');
assert.equal(communication.resolveCommunicationContext({ ...baseCommunication, criticalResolutionStatus: 'LOW_REQUESTED' }), 'LAST_FAILED');
assert.equal(communication.resolveCommunicationContext({ ...baseCommunication, criticalResolutionStatus: 'INTERN' }), 'LAST_FAILED');
assert.equal(communication.resolveCommunicationContext({ ...baseCommunication, criticalResolutionStatus: 'LOW_CONFIRMED' }), 'LOW');

// Persistencia del checkpoint.
const migration = read('api/scripts/migrate-bbva-checkpoint-v19.sql');
assert.match(migration, /CREATE TABLE bbva\.CertificationCriticalResolution/);
assert.match(migration, /PENDING_REVIEW.*LOW_REQUESTED.*INTERN.*LOW_CONFIRMED/s);
assert.match(migration, /CREATE TABLE bbva\.DashboardMetricSnapshot/);
assert.match(migration, /CoveragePercent/);
assert.match(migration, /VendorReadyPercent/);
assert.match(migration, /system\.checkpoint@basebfs\.local/);
assert.match(migration, /latestAttempt\.Result=N'FAILED'/);
assert.match(migration, /NOT EXISTS \(\s*SELECT 1 FROM bbva\.CertificationCriticalResolution/s);

const lifecycle = read('api/src/lib/bbvaPersonLifecycleRepository.ts');
assert.match(lifecycle, /pendingReview/);
assert.match(lifecycle, /lowRequested/);
assert.match(lifecycle, /caso crítico 2\/2 sin resolver/);
assert.match(lifecycle, /solicitud de baja pendiente por agotamiento 2\/2/);
assert.match(lifecycle, /resolution\.ResolutionStatus=N'LOW_REQUESTED'/);
assert.match(lifecycle, /ResolutionStatus=N'LOW_CONFIRMED'/);
assert.match(lifecycle, /reason\.reasonGroup !== 'BBVA_EXIT'/);

const dashboardService = read('api/src/lib/bbvaDashboardService.ts');
assert.match(dashboardService, /buildRecommendations/);
assert.match(dashboardService, /upsertMetricSnapshot\(cards, actorEmail, todayIso\)/);
assert.match(dashboardService, /metricHistory\(historyDays, todayIso\)/);
assert.match(dashboardService, /isCriticalResolutionOpen/);
assert.match(dashboardService, /bbvaBusinessDate/);

const certificationService = read('api/src/lib/bbvaCollaboratorCertificationService.ts');
assert.match(certificationService, /isCriticalTwoAttemptLimit/);
assert.match(certificationService, /hasOpenCriticalTwoAttempt/);
assert.match(certificationService, /CRITICAL_RESOLUTION_REQUIRED/);
assert.match(certificationService, /MAX_ATTEMPTS_REACHED/);
assert.match(certificationService, /No se puede programar otra presentación en el mismo ciclo/);
assert.match(certificationService, /El caso crítico ya fue resuelto como becario para este ciclo/);
assert.match(certificationService, /Resuelve baja o becario antes de quitarla del seguimiento/);

const snapshotFunction = read('api/src/functions/bbvaDashboardSnapshots.ts');
assert.match(snapshotFunction, /schedule: '0 55 5 \* \* \*'/);
assert.match(snapshotFunction, /assertBbvaPermission\(user, 'COLLABORATOR_WRITE'\)/);

// Toda llamada frontend a servidor BBVA debe pasar por fetchApi para feedback universal.
const frontendSourceRoot = path.join(root, 'src');
for (const file of collectSourceFiles(frontendSourceRoot)) {
  if (file.endsWith(path.normalize('src/lib/api.ts'))) continue;
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(/, `fetch directo fuera de fetchApi: ${path.relative(root, file)}`);
}
const layout = read('src/componentsBBVATalent/BBVALayout.tsx');
assert.match(layout, /BBVAOperationFeedback/);
const apiClient = read('src/lib/api.ts');
assert.match(apiClient, /\['POST', 'PUT', 'PATCH', 'DELETE'\]/);
assert.match(apiClient, /servidor confirmó la operación/);
const catalogApi = read('src/pagesBBVATalent/api/catalogApi.ts');
const certificationCatalogApi = read('src/pagesBBVATalent/api/certificationCatalogApi.ts');
assert.match(catalogApi, /fetchApi/);
assert.match(certificationCatalogApi, /fetchApi/);

// UX solicitada: la fila de Seguimiento abre contexto directamente y Colaborador recupera su ficha 360.
const trackingPage = read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
assert.doesNotMatch(trackingPage, />Contexto<\/BBVAButton>/);
assert.doesNotMatch(trackingPage, /ChevronDown|ChevronUp/);
assert.match(trackingPage, /onClick=\{\(\) => setExpandedId\(isExpanded \? null : item\.certificationRecordId\)\}/);
assert.match(trackingPage, /title="Clic para desplegar contexto"/);
assert.match(trackingPage, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
assert.match(trackingPage, /Baja solicitada · falta confirmar salida/);
assert.match(trackingPage, /Críticos 2\/2 abiertos/);
assert.match(trackingPage, /filters\.critical === 'OPEN'/);
const dashboardPage = read('src/pagesBBVATalent/dashboard/BBVADashboardPage.tsx');
assert.match(dashboardPage, /critical-two-attempts.*critical=OPEN/s);
const collaboratorsPage = read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
assert.match(collaboratorsPage, /setExpanded\(isExpanded \? null : item\.id\)/);
assert.match(collaboratorsPage, /Clic para ver contexto del colaborador/);
assert.match(collaboratorsPage, /Usuario BBVA \/ XM/);
assert.match(collaboratorsPage, /Correo BBVA/);
const collaboratorDetail = read('src/pagesBBVATalent/collaborators/CollaboratorDetailPage.tsx');
assert.match(collaboratorDetail, /CollaboratorForm/);
assert.match(collaboratorDetail, /mode="view"/);
assert.match(collaboratorDetail, /BBVAFormBackButton/);
assert.doesNotMatch(collaboratorDetail, />Editar</);
const collaboratorCertifications = read('src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage.tsx');
assert.match(collaboratorCertifications, /CertificationCriticalResolutionDialog/);
assert.match(collaboratorCertifications, /Resolver baja \/ becario/);

console.log('Checkpoint de negocio BBVA V19.1: OK');
console.log('- reglas críticas 2/2 y resolución: OK');
console.log('- cobertura y readiness Q: OK');
console.log('- fecha operativa México: OK');
console.log('- comunicación LOW sólo con baja confirmada: OK');
console.log('- histórico KPI y recomendaciones backend: OK');
console.log('- feedback universal de mutaciones: OK');
console.log('- contexto por clic de fila + vista readonly unificada de colaborador: OK');
