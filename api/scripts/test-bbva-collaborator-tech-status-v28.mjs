import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const repo = read('api/src/lib/bbvaCollaboratorRepository.ts');
assert.match(repo, /AS certificationTechnologicalApplicable/);
assert.match(repo, /AS certificationTechnologicalCovered/);
assert.match(repo, /cc\.CertificationType=N'TECHNOLOGICAL'/);
assert.match(repo, /pc\.BaseStatus=N'APPROVED'/);
assert.match(repo, /EffectiveExpirationDate IS NULL OR effectiveDates\.EffectiveExpirationDate >=/);

const backendDomain = read('api/src/lib/bbvaCollaboratorDomain.ts');
const frontendType = read('src/pagesBBVATalent/types/collaborator.ts');
for (const source of [backendDomain, frontendType]) {
  assert.match(source, /certificationTechnologicalApplicable: number/);
  assert.match(source, /certificationTechnologicalCovered: number/);
}

const page = read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
assert.match(page, /certificationTechnologicalApplicable > 0 && item\.certificationTechnologicalCovered === 0/);
assert.match(page, /hasDoubleTechnologyCertification\(item\)/);
assert.match(page, /return 'DOUBLE_TECH'/);
assert.match(page, /DOUBLE_TECH: 'Doble certificación'/);
assert.match(page, /value:'DOUBLE_TECH',label:'Doble certificación'/);
assert.match(page, /normalizedStatusFilter === 'DOUBLE_TECH' \? hasDoubleTechnologyCertification\(item\) : cert === normalizedStatusFilter/);
assert.match(page, /statusFilter === 'VALID_PLUS' \? 'DOUBLE_TECH' : statusFilter/);
assert.ok(page.indexOf("if (item.certificationPending > 0) return 'PENDING'") < page.indexOf("if (item.certificationTechnologicalApplicable > 0 && hasDoubleTechnologyCertification(item)) return 'DOUBLE_TECH'"), 'Doble certificación no debe ocultar pendientes en el estado principal.');

const nav = read('src/componentsBBVATalent/bbvaNavigation.ts');
assert.doesNotMatch(nav, /certifications-second-plans|Segundas certificaciones/);
const app = read('src/App.tsx');
assert.doesNotMatch(app, /SecondCertificationPlanPage|SecondCertificationPlanEditorPage|SecondCertificationPlanDetailPage/);
assert.match(app, /path="\/bbva\/certifications\/second-plans" element=\{<Navigate to="\/bbva\/collaborators" replace \/>\}/);

for (const relative of [
  'src/pagesBBVATalent/certifications/SecondCertificationPlanPage.tsx',
  'src/pagesBBVATalent/certifications/SecondCertificationPlanEditorPage.tsx',
  'src/pagesBBVATalent/certifications/SecondCertificationPlanDetailPage.tsx',
  'src/pagesBBVATalent/hooks/useSecondCertificationPlans.ts',
  'src/pagesBBVATalent/api/secondCertificationPlanApi.ts',
  'src/pagesBBVATalent/types/secondCertificationPlan.ts',
  'api/src/functions/bbvaSecondCertificationPlans.ts',
  'api/src/lib/bbvaSecondCertificationPlanService.ts',
  'api/src/lib/bbvaSecondCertificationPlanRepository.ts',
  'api/src/lib/bbvaSecondCertificationPlanDomain.ts',
]) assert.equal(exists(relative), false, `El módulo independiente todavía existe: ${relative}`);

const migration = read('api/scripts/migrate-bbva-v26-operational-catalogs.sql');
assert.match(migration, /SecondTechnologyCertificationPlan/, 'La migración histórica V26 debe conservarse para reproducibilidad.');

console.log('Estado de certificación tecnológica adicional V28: OK');
console.log('- 0/1/2+ tecnológicas se derivan de certificaciones reales, no de un plan paralelo: OK');
console.log('- 2+ tecnológicas vigentes => Doble certificación cuando el resto está en regla: OK');
console.log('- filtro Doble certificación encuentra 2+ tecnológicas aunque exista otra alerta operativa: OK');
console.log('- pendientes/críticos/vencimientos conservan prioridad: OK');
console.log('- módulo independiente de segundas certificaciones retirado con redirect retrocompatible: OK');
