import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const servicePath = path.join(root, 'api/src/lib/bbvaCollaboratorImportService.ts');
const source = fs.readFileSync(servicePath, 'utf8');

const start = source.indexOf('function normalizeRow(');
assert.ok(start >= 0, 'Debe existir normalizeRow.');
let end = source.indexOf('\nfunction ', start + 1);
if (end < 0) end = source.length;
const block = source.slice(start, end);

assert.match(block, /const\s+developmentTechnology\s*=\s*parseCurrentTechnologyAndExpertise\s*\(/);
assert.match(block, /const\s+certificationTechnology\s*=/);
assert.match(block, /(?:^|\n)\s*certificationTechnology\s*(?::|,)/m);
assert.match(block, /currentTechnology\s*:\s*developmentTechnology\.technology\s*,/);
assert.doesNotMatch(block, /currentTechnology\s*:\s*certificationTechnology[^\r\n]*,/);

console.log('Authoritative Technology V26.1c: OK');
console.log('- tecnología actual <- tecnología de desarrollo actual: OK');
console.log('- tecnología de certificación permanece independiente: OK');
