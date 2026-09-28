import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const service = fs.readFileSync(path.join(root, 'api/src/lib/bbvaCollaboratorImportService.ts'), 'utf8');
const v22 = fs.readFileSync(path.join(root, 'api/scripts/test-bbva-authoritative-field-mapping-v22.mjs'), 'utf8');

const start = service.indexOf('function normalizeRow(');
assert.ok(start >= 0, 'Debe existir normalizeRow.');
let end = service.indexOf('\nfunction ', start + 1);
if (end < 0) end = service.length;
const block = service.slice(start, end);

assert.match(block, /const\s+developmentTechnology\s*=\s*parseCurrentTechnologyAndExpertise\s*\(/);
assert.match(block, /const\s+explicitExpertise\s*=/);
assert.match(block, /expertise\s*:\s*(?:explicitExpertise\s*\?\?\s*developmentTechnology\.expertise|developmentTechnology\.expertise\s*\?\?\s*explicitExpertise)\s*,/);
assert.doesNotMatch(block, /expertise\s*:\s*certificationTechnology/);

assert.match(v22, /V26\.1f: expertise autoritativo usa sólo expertise explícito\/desarrollo actual/);
const remainingStale = v22.split(/\r?\n/).some((line) =>
  line.includes('assert.match(')
  && line.includes('expertise')
  && line.includes('explicitExpertise')
  && line.includes('actualTechnology')
);
assert.equal(remainingStale, false, 'V22 no debe conservar la aserción obsoleta actualTechnology/expertise.');

console.log('Authoritative Expertise V26.1f: OK');
console.log('- expertise usa únicamente expertise explícito/desarrollo actual: OK');
console.log('- tecnología de certificación no contamina expertise: OK');
console.log('- regresión V22 corregida con búsqueda tolerante a escapes: OK');
