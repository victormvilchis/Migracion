import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const tracking = read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const metrics = read('src/pagesBBVATalent/certifications/CertificationMetricsPage.tsx');
const dashboard = read('src/pagesBBVATalent/dashboard/BBVADashboardPage.tsx');
const reports = read('src/pagesBBVATalent/reports/BBVAReportsPage.tsx');
const collaborators = read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
const talent = read('src/pagesBBVATalent/talentBank/TalentBankPage.tsx');
const collaboratorCerts = read('src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage.tsx');
const attempt = read('src/pagesBBVATalent/collaboratorCertifications/CertificationAttemptPage.tsx');
const quickApproval = read('src/componentsBBVATalent/CertificationQuickApprovalDialog.tsx');
const structureFilter = read('src/componentsBBVATalent/BBVAStructureFilter.tsx');
const catalogRepo = read('api/src/lib/bbvaCertificationCatalogRepository.ts');
const certRepo = read('api/src/lib/bbvaCollaboratorCertificationRepository.ts');
const certService = read('api/src/lib/bbvaCollaboratorCertificationService.ts');

// Todo tablero con KPIs filtra primero y luego muestra las tarjetas.
for (const [name, source] of [['Métricas', metrics], ['Panel', dashboard], ['Reportes', reports]]) {
  const filterIndex = source.indexOf('<BBVAFilterBar');
  const metricIndex = source.indexOf('<BBVAMetricCard');
  assert.ok(filterIndex >= 0 && metricIndex >= 0 && filterIndex < metricIndex, `${name}: los filtros deben estar antes de los KPI.`);
}
const trackingFilterIndex = tracking.indexOf('placeholder=\"Buscar colaborador...\"');
const trackingMetricIndex = tracking.indexOf('<BBVAMetricCard');
assert.ok(trackingFilterIndex >= 0 && trackingMetricIndex > trackingFilterIndex, 'Seguimiento: los filtros compactos deben estar antes de los KPI.');
assert.ok(collaboratorCerts.indexOf('<BBVAFilterBar') < collaboratorCerts.indexOf('>Cobertura<'), 'Certificaciones del colaborador: filtros antes del resumen KPI.');

// Seguimiento ya no duplica el corte Vendors como tarjeta independiente.
assert.doesNotMatch(tracking, /Preparación Vendors|PREPARACIÓN VENDORS|Preparación para corte Vendors/);

// Tecnología es multiselect en los contextos operativos principales.
for (const [name, source] of [['Colaboradores', collaborators], ['Banco de talento', talent], ['Panel', dashboard], ['Métricas', metrics]]) {
  assert.match(source, /BBVAMultiSelect/, `${name}: tecnología debe usar multiselect.`);
}
assert.match(tracking, /decodeMultiValue\(filters\.technology\)/);
assert.match(tracking, /encodeMultiValue\(\[value\.slice\(6\)\]\)/);
assert.match(tracking, /ariaLabel=\"Tecnología o certificación\"/);

// Estructuras BBVA: un solo control compacto y jerárquico N2 -> N3.
for (const source of [collaborators, talent, dashboard, metrics]) assert.match(source, /BBVAStructureFilter/);
assert.match(structureFilter, /Buscar nivel 2 o nivel 3/);
assert.match(structureFilter, /Nivel 2/);
assert.match(structureFilter, /↳/);
assert.doesNotMatch(structureFilter, /rounded-xl border border-slate-100 bg-slate-50\/45/);

// Calificación / score: sólo aparece cuando el catálogo la maneja y viaja hasta SQL.
assert.match(attempt, /item\.tracksScore\?<label/);
assert.match(attempt, /Calificación \/ score/);
assert.match(quickApproval, /tracksScore/);
assert.match(quickApproval, /Calificación \/ score/);
assert.match(certService, /normalizeScore10/);
assert.match(certService, /Esta certificación no maneja calificación/);
assert.match(certRepo, /Score10/);
assert.match(certRepo, /LastScore10/);
assert.match(certRepo, /TracksScore/);

// Orden canónico de niveles: JR -> STD -> SR (GENERIC sólo después, cuando aplique).
assert.match(catalogRepo, /WHEN N'JR' THEN 1 WHEN N'STD' THEN 2 WHEN N'SR' THEN 3/);
assert.match(collaboratorCerts, /\{JR:1,STD:2,SR:3\}/);

// Estado/Estatus es siempre la última columna de negocio, inmediatamente antes de Acciones.
const pagesRoot = path.join(root, 'src/pagesBBVATalent');
const pageFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.name.endsWith('.tsx')) pageFiles.push(absolute);
  }
};
walk(pagesRoot);
let statusTablesChecked = 0;
for (const absolute of pageFiles) {
  const source = fs.readFileSync(absolute, 'utf8');
  for (const match of source.matchAll(/<thead[\s\S]*?<\/thead>/g)) {
    const headers = [...match[0].matchAll(/<th[\s\S]*?<\/th>/g)].map((item) => item[0]);
    const statusIndexes = headers.map((header, index) => /Estado|Estatus/.test(header) ? index : -1).filter((index) => index >= 0);
    const actionIndexes = headers.map((header, index) => /Acciones|Acción/.test(header) ? index : -1).filter((index) => index >= 0);
    if (!statusIndexes.length || !actionIndexes.length) continue;
    statusTablesChecked += 1;
    assert.equal(statusIndexes.at(-1), actionIndexes[0] - 1, `${path.relative(root, absolute)}: Estado/Estatus debe estar inmediatamente antes de Acciones.`);
  }
}
assert.ok(statusTablesChecked >= 9, `Se esperaban al menos 9 tablas con Estado/Estatus + Acciones; se revisaron ${statusTablesChecked}. El explorador V31 sustituyó una tabla de catálogo por una vista visual.`);

console.log('UX operativa BBVA V30.4: OK');
console.log('- filtros arriba de KPIs en paneles/tableros: OK');
console.log('- score condicionado por TracksScore y persistido: OK');
console.log('- niveles JR -> STD -> SR: OK');
console.log('- Estado/Estatus terminal antes de Acciones: OK');
console.log('- Seguimiento sin tarjeta Vendors redundante: OK');
console.log('- Tecnología multiselect donde aplica; Seguimiento usa selector unificado tecnología/certificación: OK');
