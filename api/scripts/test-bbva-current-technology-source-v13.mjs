import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAuthoritativeCurrentTechnology } from '../dist/lib/bbvaCollaboratorImportService.js';

assert.equal(resolveAuthoritativeCurrentTechnology({
  'TECNOLOGÍA EN LA QUE SE CERTIFICA': 'JAVA',
  'TECNOLOGÍA ACTUAL': 'DATIO',
  'Tecnologia en la que desarrolla actualmente y expertis': 'DATIO-STD',
}), 'JAVA');

assert.equal(resolveAuthoritativeCurrentTechnology({
  'TECNOLOGÍA EN LA QUE SE CERTIFICA': 'ASO DISEÑO',
  'Tecnologia en la que desarrolla actualmente y expertis': 'ASO-JR',
}), 'ASO DISEÑO');

assert.equal(resolveAuthoritativeCurrentTechnology({
  'TECNOLOGIA EN LA QUE SE CERTIFICA': 'ingeniero de procesos',
  'TECNOLOGÍA ACTUAL': 'QA',
}), 'INGENIERO DE PROCESOS');

assert.equal(resolveAuthoritativeCurrentTechnology({
  'TECNOLOGÍA ACTUAL': 'APX',
  'Tecnologia en la que desarrolla actualmente y expertis': 'APX-STD',
}), null);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const source = fs.readFileSync(path.join(root, 'api/src/lib/bbvaCollaboratorImportService.ts'), 'utf8');

assert.match(source, /currentTechnology:\s*\['TECNOLOGIA EN LA QUE SE CERTIFICA',\s*'TECNOLOGÍA EN LA QUE SE CERTIFICA'\]/);
assert.match(source, /currentTechnology:\s*certificationTechnology/);
assert.match(source, /expertise:\s*explicitExpertise\s*\?\?\s*developmentTechnology\.expertise/);
assert.doesNotMatch(source, /currentTechnology:\s*explicitCurrentTechnology\s*\?\?/);
assert.doesNotMatch(source, /currentTechnology:\s*actualTechnology\.technology/);

console.log('Fuente autoritativa de Tecnología actual V13: OK');
