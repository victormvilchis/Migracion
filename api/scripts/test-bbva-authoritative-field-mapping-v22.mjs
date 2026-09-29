import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveAuthoritativeCertificationTechnology,
  resolveAuthoritativeCurrentTechnology,
  resolveAuthoritativeImportDates,
} from '../dist/lib/bbvaCollaboratorImportService.js';

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

const technologyRow = {
  'TECNOLOGÍA EN LA QUE DESARROLLA ACTUALMENTE Y EXPERTIS': 'JAVA SR',
  'TECNOLOGÍA EN LA QUE SE CERTIFICA': 'APX ONLINE',
};
assert.equal(resolveAuthoritativeCurrentTechnology(technologyRow), 'JAVA');
assert.equal(resolveAuthoritativeCertificationTechnology(technologyRow), 'APX ONLINE');

const certificationOnlyRow = {
  'TECNOLOGÍA EN LA QUE SE CERTIFICA': 'SALESFORCE',
};
assert.equal(resolveAuthoritativeCurrentTechnology(certificationOnlyRow), null);
assert.equal(resolveAuthoritativeCertificationTechnology(certificationOnlyRow), 'SALESFORCE');

const developmentOnlyRow = {
  'TECNOLOGIA EN LA QUE DESARROLLA ACTUALMENTE Y EXPERTIS': 'LRBA STD',
};
assert.equal(resolveAuthoritativeCurrentTechnology(developmentOnlyRow), 'LRBA');
assert.equal(resolveAuthoritativeCertificationTechnology(developmentOnlyRow), null);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const backend = fs.readFileSync(path.join(root, 'api/src/lib/bbvaCollaboratorImportService.ts'), 'utf8');
const enrichment = fs.readFileSync(path.join(root, 'src/pagesBBVATalent/lib/collaboratorImportEnrichment.ts'), 'utf8');

// Fechas autoritativas: BBVA y Softtek permanecen independientes.
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

// Tecnología actual, expertise y tecnología de certificación son conceptos distintos.
assert.match(backend, /CERTIFICATION_TECHNOLOGY_ALIASES/);
assert.match(backend, /CURRENT_TECHNOLOGY_EXPERTISE_PREFIXES/);
assert.doesNotMatch(backend, /currentTechnology:\s*\['TECNOLOGIA EN LA QUE SE CERTIFICA'/);
assert.match(backend, /const\s+certificationTechnology\s*=\s*resolveAuthoritativeCertificationTechnology\(source\.values\)/);
assert.match(backend, /currentTechnology:\s*developmentTechnology\.technology/);
assert.doesNotMatch(backend, /currentTechnology:\s*certificationTechnology/);
assert.match(backend, /expertise:\s*explicitExpertise\s*\?\?\s*developmentTechnology\.expertise/);
assert.doesNotMatch(backend, /expertise:\s*certificationTechnology/);
assert.match(backend, /row\.certificationTechnology/);

// Retrocompatibilidad V20.2: conservar conciliación, trazabilidad y Gestión Softtek.
assert.match(backend, /originalFullName:/);
assert.match(backend, /bbvaStructureLevel2:/);
assert.match(backend, /bbvaStructureLevel3:/);
assert.match(backend, /bbvaAccessStatus:/);
assert.match(backend, /softtekManagement/);
assert.match(backend, /qualitySummary/);
assert.match(backend, /recordImportProvenance/);
assert.match(backend, /provenanceForRow/);

console.log('Mapeo autoritativo V22/V27A: OK');
console.log('- fechas BBVA/Softtek desde fuentes reales: OK');
console.log('- tecnología actual <- desarrollo actual: OK');
console.log('- tecnología de certificación <- columna de certificación: OK');
console.log('- expertise separado de tecnología de certificación: OK');
console.log('- conciliación/provenance/quality/Gestión Softtek preservados: OK');
