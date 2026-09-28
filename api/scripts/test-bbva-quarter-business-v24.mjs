import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'../..');const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const dashboardService=read('api/src/lib/bbvaDashboardService.ts');
const attemptRepo=read('api/src/lib/bbvaCollaboratorCertificationRepository.ts');
const collaboratorRepo=read('api/src/lib/bbvaCollaboratorRepository.ts');
const talentRepo=read('api/src/lib/bbvaTalentRepository.ts');
const tracking=read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const quarter=read('src/componentsBBVATalent/BBVAQuarterSelector.tsx');
const structures=read('src/pagesBBVATalent/catalogs/StructureCatalogPage.tsx');
const form=read('src/componentsBBVATalent/CollaboratorForm.tsx');
const migration=read('api/scripts/migrate-bbva-structures-v24.sql');
const collaborators=read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
const css=read('src/index.css');
const standards=read('AGENTS.md');

// Q: 0 vencimientos => 100%; cobertura depende de quarterDueCount, no de pendientes sin fecha.
assert.match(dashboardService,/const quarterDueCount = selectedQuarter/);
assert.match(dashboardService,/const qCovered = Math\.max\(0, totalApplicable - quarterDueCount\)/);
assert.match(dashboardService,/coveragePercent = totalApplicable \? Math\.round\(\(qCovered \/ totalApplicable\)/);
assert.match(dashboardService,/expiring: quarterDueCount/);

// Intentos: el alias SQL locked usa las propiedades correctas y respeta aplicabilidad real.
assert.match(attemptRepo,/pc\.Applicable AS applicable/);
assert.match(attemptRepo,/if \(!Boolean\(config\.applicable\)\)/);
assert.match(attemptRepo,/String\(config\.baseStatus\)/);
assert.doesNotMatch(attemptRepo,/Boolean\(config\.Applicable\)/);

// Lista vs detalle usa la misma vigencia efectiva.
assert.match(collaboratorRepo,/EffectiveExpirationDate/);
assert.match(collaboratorRepo,/LatestApprovedAttemptDate/);

// Banco: urgencia sólo por permanencia >60 días.
assert.match(talentRepo,/urgentAssignment: daysInTalentBank > 60/);
assert.doesNotMatch(talentRepo,/talentBankEntryCount > 2/);

// Seguimiento simple y contextual: Q sí; Estructura/Postal no.
assert.match(tracking,/quarterCode/);
assert.match(tracking,/Periodo de vencimiento/);
assert.match(tracking,/>Periodo<\/th>/);
assert.doesNotMatch(tracking,/Estructura BBVA/);
assert.doesNotMatch(tracking,/>Postal<\/BBVAButton>/);

// Selector Q simplificado a un único control con calendario configurado.
assert.match(quarter,/Buscar periodo/);
assert.doesNotMatch(quarter,/yearQuarters\.map/);

// Estructuras: un módulo jerárquico y formulario conectado al catálogo.
assert.match(migration,/CREATE TABLE bbva\.StructureCatalog/);
assert.match(migration,/LevelCode=2 AND ParentId IS NULL/);
assert.match(migration,/LevelCode=3 AND ParentId IS NOT NULL/);
assert.match(structures,/Jerarquía Nivel 2 → Nivel 3/);
assert.match(form,/useStructureOptions/);
assert.match(form,/Seleccionar nivel 2/);
assert.match(form,/Seleccionar nivel 3/);

// Duplicidad: estructuras quedan en fila principal, no se repiten en detalle expandido.
const expanded=collaborators.slice(collaborators.indexOf('{isExpanded ?'));
assert.equal((expanded.match(/Estructura nivel 2/g)||[]).length,0);
assert.equal((expanded.match(/Estructura nivel 3/g)||[]).length,0);

// Vida visual perceptible + accesibilidad.
assert.match(css,/bbva-live-breathe/);
assert.match(css,/bbva-quarter-flow/);
assert.match(css,/prefers-reduced-motion/);
assert.match(standards,/Más de 60 días/);
assert.match(standards,/cobertura del Q es 100%/);
console.log('Quarter + Business Rules V24: OK');
console.log('- cobertura realmente por Q: OK');
console.log('- intentos/aplicabilidad y vigencia efectiva: OK');
console.log('- Banco urgente >60 días: OK');
console.log('- Seguimiento con Q y sin duplicados/postal: OK');
console.log('- catálogo jerárquico Estructuras BBVA: OK');
console.log('- UX viva y accesible: OK');
