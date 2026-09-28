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
  'FECHA CONTRATACIÃ“N SOFTTEK': '2024-10-29',
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

// Fuentes autoritativas y separaciÃ³n de conceptos.
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
// V26.1d: tecnologÃ­a actual proviene de desarrollo actual; certificaciÃ³n permanece independiente.
assert.match(backend, /currentTechnology:\s*developmentTechnology\.technology/);
assert.doesNotMatch(backend, /currentTechnology:\s*certificationTechnology/);
assert.match(backend, /resolveAuthoritativeCurrentTechnology[\s\S]*?CURRENT_TECHNOLOGY_EXPERTISE_PREFIXES/);
assert.match(backend, /CERTIFICATION_TECHNOLOGY_ALIASES/);
// V26.1f: expertise autoritativo usa sÃ³lo expertise explÃ­cito/desarrollo actual.
assert.match(backend, /const\s+developmentTechnology\s*=\s*parseCurrentTechnologyAndExpertise/);
assert.match(backend, /const\s+explicitExpertise\s*=/);
// V26.1f: expertise autoritativo usa sólo expertise explícito/desarrollo actual.
assert.match(backend, /const\s+developmentTechnology\s*=\s*parseCurrentTechnologyAndExpertise/);
assert.match(backend, /const\s+explicitExpertise\s*=/);
assert.match(backend, /expertise\s*:\s*(?:explicitExpertise\s*\?\?\s*developmentTechnology\.expertise|developmentTechnology\.expertise\s*\?\?\s*explicitExpertise)\s*,/);
assert.doesNotMatch(backend, /expertise\s*:\s*certificationTechnology/);
assert.doesNotMatch(backend, /expertise\s*:\s*certificationTechnology/);

// Retrocompatibilidad V20.2: no perder conciliaciÃ³n, trazabilidad ni GestiÃ³n Softtek.
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
console.log('- tecnologÃ­a de certificaciÃ³n separada de tecnologÃ­a actual: OK');
console.log('- perfil Headcount no sustituye PERFIL Tablero: OK');
console.log('- conciliaciÃ³n/provenance/quality/gestiÃ³n Softtek preservados: OK');
