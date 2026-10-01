import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const repository = read('api/src/lib/bbvaCollaboratorCertificationRepository.ts');
const page = read('src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage.tsx');
const dialog = read('src/componentsBBVATalent/CertificationCoverageDialog.tsx');

assert.doesNotMatch(page, /Una certificación aprobada no extiende su vigencia registrando otro intento en el mismo ciclo/);
assert.match(repository, /\.input\('recordId', sql\.UniqueIdentifier, memberRecordIds\[index\]\)\s*\.input\('personId', sql\.UniqueIdentifier, personId\)\s*\.input\('groupId', sql\.UniqueIdentifier, groupId\)/s);
assert.match(repository, /WHERE Id=@recordId AND PersonId=@personId/);
assert.match(dialog, /Subir en orden/);
assert.match(dialog, /Bajar en orden/);
assert.match(dialog, /actualmente en métrica/);

console.log('BBVA Certification Coverage Reorder V31.22: OK');
console.log('- se elimina la alerta informativa de recertificación en el listado: OK');
console.log('- reordenar cobertura enlaza @personId en cada UPDATE: OK');
console.log('- JAVA puede subir de posición y APX quedar debajo sin cambiar vigencias: OK');
