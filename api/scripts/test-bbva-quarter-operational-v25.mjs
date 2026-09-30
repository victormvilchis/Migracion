import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const collaboratorDetail = read('src/pagesBBVATalent/collaborators/CollaboratorDetailPage.tsx');
const collaboratorForm = read('src/componentsBBVATalent/CollaboratorForm.tsx');
const dashboard = read('src/pagesBBVATalent/dashboard/BBVADashboardPage.tsx');
const metrics = read('src/pagesBBVATalent/certifications/CertificationMetricsPage.tsx');
const tracking = read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const trackingRules = read('src/pagesBBVATalent/lib/certificationTracking.ts');
const talent = read('src/pagesBBVATalent/talentBank/TalentBankPage.tsx');
const talentRepo = read('api/src/lib/bbvaTalentRepository.ts');
const dashboardRepo = read('api/src/lib/bbvaDashboardRepository.ts');
const dashboardService = read('api/src/lib/bbvaDashboardService.ts');
const display = read('src/pagesBBVATalent/lib/bbvaDisplayFormat.ts');
const catalog = read('src/pagesBBVATalent/certifications/CertificationCatalogListPage.tsx');
const attempt = read('src/pagesBBVATalent/collaboratorCertifications/CertificationAttemptPage.tsx');
const certList = read('src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage.tsx');
const certDetail = read('src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationDetailPage.tsx');
const standards = read('AGENTS.md');

// Ver colaborador = mismo formulario CRUD, sólo lectura, con un único regreso superior.
assert.match(collaboratorDetail, /<CollaboratorForm[\s\S]*?mode="view"/);
assert.match(collaboratorDetail, /<BBVAFormBackButton/);
assert.doesNotMatch(collaboratorDetail, />Editar</);
assert.doesNotMatch(collaboratorDetail, />Certificaciones</);
assert.doesNotMatch(collaboratorDetail, /\/certifications/);
assert.match(collaboratorForm, /const readOnly = isBBVAFormReadOnly\(mode\)/);

// Q integrado en la misma barra de filtros: no hay segundo header/strip en Panel/Métricas.
for (const source of [dashboard, metrics]) {
  assert.match(source, /ariaLabel="Periodo"/);
  assert.match(source, /quarterOptions/);
  assert.doesNotMatch(source, /BBVAQuarterSelector/);
}

// KPI crítico y drill-down usan el mismo estado de negocio: FAILED + 2\/2 + último FAILED + resolución abierta.
assert.match(dashboardService, /cert\.baseStatus === 'FAILED'[\s\S]*?isCriticalTwoAttemptExhausted\(cert\)[\s\S]*?isCriticalResolutionOpen\(cert\.criticalResolutionStatus\)/);
assert.match(tracking, /filters\.critical === 'OPEN' \? hasOpenCriticalResolution\(item\)/);
assert.match(tracking, /!filters\.critical \|\| \(filters\.critical === 'OPEN'/);
assert.match(trackingRules, /requiresCriticalExitReview[\s\S]*?criticalActionRequired === true/);
assert.match(trackingRules, /hasOpenCriticalResolution[\s\S]*?LOW_REQUESTED/);

// Las métricas Q consumen la vigencia efectiva, igual que el detalle de certificaciones.
assert.match(dashboardRepo, /effectiveDates\.EffectiveExpirationDate/);
assert.match(dashboardRepo, /LatestApprovedAttemptDate/);
assert.match(dashboardRepo, /cc\.ValidityMonths/);
assert.match(dashboardService, /const quarterDueCount = selectedQuarter/);

// Banco de talento: días para todos los registros activos desde el último hito real de entrada; urgencia >60.
assert.match(talentRepo, /EventType IN \(N'COLLABORATOR_TO_TALENT',N'ENTERED_TALENT_BANK'\)/);
assert.match(talentRepo, /lifecycle\.EventType=N'COLLABORATOR_TO_TALENT'/);
assert.match(talentRepo, /CONVERT\(date,t\.CreatedAt\) < CONVERT\(date,lifecycle\.EffectiveDate\)/);
assert.match(talentRepo, /bankSinceDate/);
assert.match(talentRepo, /entryDate/);
assert.match(talentRepo, /bankSinceDate/);
assert.match(talentRepo, /daysInTalentBank > 60/);
assert.match(talent, />CV<\/th>/);
const expanded = talent.slice(talent.indexOf('{isExpanded?'));
assert.doesNotMatch(expanded, />CV<\/div>/);

// Certificaciones se presentan en MAYÚSCULAS en superficies operativas.
assert.match(display, /displayCertificationName[\s\S]*?upperDisplay/);
for (const source of [catalog, metrics, tracking, attempt, certList, certDetail]) {
  assert.match(source, /displayCertificationName/);
}

assert.match(standards, /nombres de certificaciones se muestran en MAYÚSCULAS/);
assert.match(standards, /selector de Q forma parte de la misma barra de filtros/);
assert.match(standards, /más de 60 días se marca urgente/);

console.log('Quarter Operational V25: OK');
console.log('- Ver colaborador = formulario readonly sin CTAs laterales: OK');
console.log('- Q integrado en filtros, sin doble header: OK');
console.log('- crítico 2/2 KPI/drill-down alineado: OK');
console.log('- vigencia efectiva usada por KPIs Q: OK');
console.log('- permanencia Talent Bank y urgencia >60 días: OK');
console.log('- certificaciones en MAYÚSCULAS: OK');
