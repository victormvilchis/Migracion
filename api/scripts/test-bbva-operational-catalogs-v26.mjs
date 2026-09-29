import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const talentPage = read('src/pagesBBVATalent/talentBank/TalentBankPage.tsx');
assert.match(talentPage, />Ver CV</);
assert.doesNotMatch(talentPage, /item\.cv\.fileName/);
assert.match(talentPage, /Entrada a Talent Bank/);
assert.match(talentPage, /Alta BBVA/);
assert.match(talentPage, /Contratación Softtek/);
assert.match(talentPage, /BBVAStructureFilter/);
assert.match(talentPage, /Limpiar filtros/);

const talentRepo = read('api/src/lib/bbvaTalentRepository.ts');
assert.match(talentRepo, /const entry = base\.entryDate/);
assert.match(talentRepo, /urgentAssignment: daysInTalentBank > 60/);
assert.doesNotMatch(talentRepo, /entryCount\s*>?=\s*3/);

const collaborators = read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
assert.match(collaborators, /deliveryManagerFilter/);
assert.match(collaborators, /Todos los DM/);
assert.match(collaborators, /BBVAStructureFilter/);
assert.match(collaborators, /Limpiar filtros/);

const periodOptions = read('src/pagesBBVATalent/lib/periodOptions.ts');
assert.match(periodOptions, /filter\(\(item\)=>item\.year===year\)/);
assert.match(periodOptions, /Periodo \$\{item\.quarter\}/);

const tracking = read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
assert.match(tracking, /Resumen operativo de seguimiento/);
assert.doesNotMatch(tracking, />Certificaciones por atender</);
assert.doesNotMatch(tracking, /registros en el contexto actual/);
assert.match(tracking, /density="compact"/);
assert.match(tracking, /BBVAPagination/);
assert.match(tracking, /ariaLabel="Periodo de vencimiento"/);
assert.match(tracking, /Limpiar filtros/);

const metrics = read('src/pagesBBVATalent/certifications/CertificationMetricsPage.tsx');
assert.doesNotMatch(metrics, />Métricas por periodo</);
assert.doesNotMatch(metrics, /Vigencia, cobertura y vencimientos responden al periodo seleccionado/);
assert.match(metrics, /BBVAPagination/);
assert.match(metrics, /ariaLabel="Periodo"/);

const dashboard = read('src/pagesBBVATalent/dashboard/BBVADashboardPage.tsx');
assert.match(dashboard, /ariaLabel="Periodo"/);
assert.match(dashboard, />Limpiar<\/BBVAButton>/);

const explorer = read('src/pagesBBVATalent/staffing/EngineeringSpecialtyExplorerPage.tsx');
assert.match(explorer, /Jerarquía/);
assert.match(explorer, /Mapa de calor/);
assert.match(explorer, /Insights/);
assert.match(explorer, /Estructura BBVA/);
assert.match(explorer, /Staffer/);
assert.doesNotMatch(explorer, /<table/);
assert.doesNotMatch(explorer, /Importar/);
const app = read('src/App.tsx');
assert.match(app, /engineering-specialties\/structures\/:id\/edit/);
assert.match(app, /catalogs\/structures\/\*/);
assert.match(app, /Navigate to="\/bbva\/admin\/catalogs\/engineering-specialties" replace/);

const migration = read('api/scripts/migrate-bbva-v26-operational-catalogs.sql');
assert.match(migration, /EngineeringSpecialtyCatalog/);
assert.match(migration, /SecondTechnologyCertificationPlan/);
assert.match(migration, /UpdatedByEmail/);
assert.doesNotMatch(migration, /POOL = MEX - ENG - Perfil - Gremio - Especialidad/);
assert.doesNotMatch(migration, /Responsable ASO/);
const seedStart = migration.indexOf('INSERT INTO @Seed');
const seedEnd = migration.indexOf('MERGE bbva.EngineeringSpecialtyCatalog');
const seedBlock = migration.slice(seedStart, seedEnd);
assert.equal((seedBlock.match(/\n\s*\(N'/g) ?? []).length, 78, 'El seed debe contener exactamente las 78 especialidades útiles del CSV fuente; la última fila del CSV es metadata de actualización.');
assert.match(seedBlock, /ALEJANDRO FERREYRA MOTA \/ TERESA NATALIA AMMLER CASTELLANOS/);

const specialtyService = read('api/src/lib/bbvaEngineeringSpecialtyService.ts');
assert.match(specialtyService, /toLocaleUpperCase\('es-MX'\)/);
const specialtyFunction = read('api/src/functions/bbvaEngineeringSpecialties.ts');
assert.match(specialtyFunction, /CATALOG_READ/);
assert.match(specialtyFunction, /CATALOG_WRITE/);

// La tabla histórica de V26 se conserva por reproducibilidad de esquema, pero el módulo runtime fue retirado.
assert.match(migration, /SecondTechnologyCertificationPlan/);
assert.equal(fs.existsSync(path.join(root, 'src/pagesBBVATalent/certifications/SecondCertificationPlanPage.tsx')), false);
assert.equal(fs.existsSync(path.join(root, 'api/src/functions/bbvaSecondCertificationPlans.ts')), false);
const collaboratorRepo = read('api/src/lib/bbvaCollaboratorRepository.ts');
assert.match(collaboratorRepo, /technologicalApplicableCount/);
assert.match(collaboratorRepo, /technologicalCoveredCount/);
const collaboratorPage = read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
assert.match(collaboratorPage, /Doble certificación/);

const attemptPage = read('src/pagesBBVATalent/collaboratorCertifications/CertificationAttemptPage.tsx');
assert.match(attemptPage, /Editar intento/);
assert.match(attemptPage, /Resultado \/ status/);
assert.match(attemptPage, /attemptNumber/);
const attemptApi = read('src/pagesBBVATalent/api/collaboratorCertificationApi.ts');
assert.match(attemptApi, /updateAttempt/);
const attemptRepo = read('api/src/lib/bbvaCollaboratorCertificationRepository.ts');
assert.match(attemptRepo, /ATTEMPT_EDITED/);
assert.match(attemptRepo, /CRITICAL_REVIEW_CLEARED/);
assert.match(attemptRepo, /criticalAfterEdit/);
assert.match(attemptRepo, /WITH \(UPDLOCK,HOLDLOCK\)/);

const runner = read('api/scripts/apply-bbva-v26-operational-catalogs.mjs');
assert.doesNotMatch(runner, /dotenv/);
assert.match(runner, /local\.settings\.json/);

console.log('V26 Operational Catalogs: OK');
console.log('- Banco de talento: CV directo + tres fechas + permanencia >60 días: OK');
console.log('- filtros DM/estructura + periodo actual: OK');
console.log('- seguimiento compacto arriba + paginación: OK');
console.log('- Estructuras + Gremios/Especialidades fusionados en explorador visual: OK');
console.log('- gremios/especialidades desde 78 especialidades fuente, sin POOL ni Responsable ASO: OK');
console.log('- segunda certificación tecnológica integrada como estado en Colaboradores: OK');
console.log('- edición auditada de intentos y recálculo crítico: OK');
