import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..', '..');
const backend = fs.readFileSync(path.join(root, 'api/src/lib/bbvaCollaboratorImportService.ts'), 'utf8');
const enrichment = fs.readFileSync(path.join(root, 'src/pagesBBVATalent/lib/collaboratorImportEnrichment.ts'), 'utf8');
const lookup = fs.readFileSync(path.join(root, 'src/componentsBBVATalent/ISLookupField.tsx'), 'utf8');

for (const source of [backend, enrichment]) {
  assert.match(source, /startDate:\s*\[[^\]]*'FECHA DE ALTA'/s);
  assert.match(source, /hireDate:\s*\[[^\]]*'FECHA ALTA -SAP'/s);
  assert.match(source, /hireDate:\s*\[[^\]]*'FECHA ALTA –SAP'/s);
  assert.match(source, /bbvaEmail:\s*\[[^\]]*'CORREO CORPORATIVO'/s);
  assert.match(source, /softtekCode:\s*\[[^\]]*'IS'/s);
  assert.match(source, /corporateUser:\s*\[[^\]]*'USUARIO BBVA'/s);
}
assert.match(lookup, /Ej\. LFCC1/);
console.log('Mapeo Headcount/identidad V17: OK');
