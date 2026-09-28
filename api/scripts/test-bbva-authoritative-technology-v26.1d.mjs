import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const service = fs.readFileSync(path.join(root, 'api/src/lib/bbvaCollaboratorImportService.ts'), 'utf8');
const v22 = fs.readFileSync(path.join(root, 'api/scripts/test-bbva-authoritative-field-mapping-v22.mjs'), 'utf8');

assert.match(service, /export function resolveAuthoritativeCurrentTechnology\(values: Record<string, string>\): string \| null \{\s*return parseCurrentTechnologyAndExpertise\(\s*valueByHeaderPrefix\(values, CURRENT_TECHNOLOGY_EXPERTISE_PREFIXES\),?\s*\)\.technology;/m);
assert.doesNotMatch(service, /resolveAuthoritativeCurrentTechnology[\s\S]{0,220}CERTIFICATION_TECHNOLOGY_ALIASES/);

const start = service.indexOf('function normalizeRow(');
assert.ok(start >= 0, 'Debe existir normalizeRow.');
let end = service.indexOf('\nfunction ', start + 1);
if (end < 0) end = service.length;
const block = service.slice(start, end);
assert.match(block, /const\s+developmentTechnology\s*=\s*parseCurrentTechnologyAndExpertise\s*\(/);
assert.match(block, /const\s+certificationTechnology\s*=/);
assert.match(block, /currentTechnology\s*:\s*developmentTechnology\.technology\s*,/);
assert.doesNotMatch(block, /currentTechnology\s*:\s*certificationTechnology/);

assert.doesNotMatch(v22, /currentTechnology: explicitCurrentTechnology \\?\\? actualTechnology\\\.technology/);

console.log('Authoritative Technology V26.1d: OK');
console.log('- helper autoritativo usa tecnologÃ­a de desarrollo actual: OK');
console.log('- normalizeRow mantiene certificaciÃ³n y tecnologÃ­a actual separadas: OK');
console.log('- regresiÃ³n V22 actualizada sin debilitar la regla: OK');
