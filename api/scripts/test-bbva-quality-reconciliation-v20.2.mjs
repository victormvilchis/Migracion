import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCertificationEvidence } from '../dist/lib/bbvaCollaboratorImportCertificationDomain.js';
import { splitMexicanFullName } from '../dist/lib/bbvaMexicanName.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const source = (values) => ({ rowNumber: 2, values });
const parse = (block, values) => parseCertificationEvidence({ source: source(values), block, startDate:'2026-01-01', config:null, hadPreviousApproval:false, todayIso:'2026-09-28' });

assert.equal(parse('DEVELOPMENT_SECURITY', {'¿APLICA DS?':'SI','GESTIÓN SOFTTEK':'Presenta próxima semana'})?.softtekManagement, 'Presenta próxima semana');
assert.equal(parse('TECHNOLOGICAL', {'¿APLICA TECNOLOGICA?':'SI','GESTIÓN SOFTTEK [2]':'Pendiente seguimiento'})?.softtekManagement, 'Pendiente seguimiento');
assert.equal(parse('NORMATIVE_TESTING', {'¿APLICA NORMATIVA?':'SI','GESTIÓN SOFTTEK [3]':'Recertifica en noviembre'})?.softtekManagement, 'Recertifica en noviembre');
assert.equal(parse('AGILE', {'¿APLICA AGILE?':'SI','GESTIÓN SOFTTEK [4]':'Confirmar liga'})?.softtekManagement, 'Confirmar liga');

assert.deepEqual(splitMexicanFullName('LUIS FERNANDO CASTILLO CONTRERAS'), { firstName:'LUIS FERNANDO', lastName:'CASTILLO CONTRERAS' });
assert.deepEqual(splitMexicanFullName('OSWALDO DE LOS SANTOS HERNANDEZ'), { firstName:'OSWALDO', lastName:'DE LOS SANTOS HERNANDEZ' });

const migration = read('api/scripts/migrate-bbva-quality-reconciliation-v20.2.sql');
for (const token of ['BbvaStructureLevel2','BbvaStructureLevel3','BbvaAccessEndDate','BbvaAccessAuthorizer','BbvaAccessStatus','SofttekManagement','TracksScore','PersonFieldProvenance','sp_executesql']) assert.ok(migration.includes(token), `Falta ${token}`);

const importService = read('api/src/lib/bbvaCollaboratorImportService.ts');
assert.ok(importService.includes("startDate: ['FECHA DE ALTA', 'FECHA ALTA BBVA']"));
assert.ok(importService.includes("hireDate: ['FECHA ALTA -SAP'"));
assert.ok(importService.includes("decision: field === 'lifecycleState' || !currentValue ? 'APPLY_EXCEL' : 'KEEP_CURRENT'"));
assert.ok(importService.includes('preservedExistingFields'));
assert.ok(importService.includes('recordImportProvenance'));

const dashboardRepo = read('api/src/lib/bbvaDashboardRepository.ts');
assert.ok(dashboardRepo.includes('cc.TracksScore=1'));
assert.ok(dashboardRepo.includes('scoreEvidence.Score10'));
assert.ok(dashboardRepo.includes('UNION ALL'));
const dashboardService = read('api/src/lib/bbvaDashboardService.ts');
assert.ok(dashboardService.includes('certificationAverage'));
assert.ok(dashboardService.includes('certificationScoreDetails'));

const catalogForm = read('src/componentsBBVATalent/CertificationCatalogForm.tsx');
assert.ok(catalogForm.includes('Participa en promedio / KPI'));
const collaboratorForm = read('src/componentsBBVATalent/CollaboratorForm.tsx');
assert.ok(collaboratorForm.includes('Información BBVA y accesos'));
const preview = read('src/pagesBBVATalent/collaborators/CollaboratorImportPage.tsx');
assert.ok(preview.includes('Doble check de calidad de datos'));

console.log('Quality Reconciliation V20.2: OK');
