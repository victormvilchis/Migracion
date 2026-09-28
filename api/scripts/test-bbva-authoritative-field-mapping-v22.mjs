import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAuthoritativeImportDates } from '../dist/lib/bbvaCollaboratorImportService.js';

const miguel = {
  'NOMBRE EXTERNO': 'MIGUEL ANGEL ALVAREZ MONTES DE OCA',
  'FECHA DE ALTA': '2024-10-29',
  'FECHA ALTA BBVA': '2016-02-25',
  'FECHA ALTA XM': '2016-02-25',
  'FECHA ALTA -SAP': '2024-08-13',
  'FECHA CONTRATACIÓN SOFTTEK': '2024-10-29',
  'FECHA INGRESO SOFTTEK': '2026-06-30',
};

assert.deepEqual(resolveAuthoritativeImportDates(miguel), {
  startDate: '2024-10-29',
  hireDate: '2024-08-13',
});

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const backend = fs.readFileSync(path.join(root, 'api/src/lib/bbvaCollaboratorImportService.ts'), 'utf8');
const enrichment = fs.readFileSync(path.join(root, 'src/pagesBBVATalent/lib/collaboratorImportEnrichment.ts'), 'utf8');

// Fuentes autoritativas y separación de conceptos.
assert.doesNotMatch(backend, /startDate:\s*\[[^\]]*FECHA ALTA XM/s);
assert.doesNotMatch(enrichment, /startDate:\s*\[[^\]]*FECHA ALTA XM/s);
assert.doesNotMatch(backend, /hireDate:\s*\[[^\]]*FECHA INGRESO SOFTTEK/s);
assert.doesNotMatch(enrichment, /hireDate:\s*\[[^\]]*FECHA INGRESO SOFTTEK/s);
assert.match(enrichment, /TABLERO_START_DATE_ALIASES/);
assert.match(enrichment, /HEADCOUNT_HIRE_DATE_ALIASES/);
assert.match(enrichment, /values\[CANONICAL\.startDate\] = tableroStartDate/);
assert.match(enrichment, /values\[CANONICAL\.hireDate\] = headcountHireDate/);
assert.doesNotMatch(enrichment, /mergeField\('hireDate'\)/);
assert.doesNotMatch(enrichment, /mergeField\('profile'\)/);
assert.match(backend, /CERTIFICATION_TECHNOLOGY_ALIASES/);
assert.match(backend, /CURRENT_TECHNOLOGY_EXPERTISE_PREFIXES/);
assert.match(backend, /row\.certificationTechnology/);
assert.match(backend, /currentTechnology: explicitCurrentTechnology \?\? actualTechnology\.technology/);
assert.match(backend, /expertise: explicitExpertise \?\? actualTechnology\.expertise/);

// Retrocompatibilidad V20.2: no perder conciliación, trazabilidad ni Gestión Softtek.
assert.match(backend, /originalFullName:/);
assert.match(backend, /bbvaStructureLevel2:/);
assert.match(backend, /bbvaStructureLevel3:/);
assert.match(backend, /bbvaAccessStatus:/);
assert.match(backend, /softtekManagement/);
assert.match(backend, /qualitySummary/);
assert.match(backend, /recordImportProvenance/);
assert.match(backend, /provenanceForRow/);

console.log('Mapeo autoritativo V22: OK');
console.log('- fechas BBVA/Softtek desde fuentes reales: OK');
console.log('- tecnología de certificación separada de tecnología actual: OK');
console.log('- perfil Headcount no sustituye PERFIL Tablero: OK');
console.log('- conciliación/provenance/quality/gestión Softtek preservados: OK');
