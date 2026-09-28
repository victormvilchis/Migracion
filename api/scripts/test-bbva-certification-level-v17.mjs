import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..', '..');
const migration = fs.readFileSync(path.join(dir, 'migrate-bbva-certification-level-v17.sql'), 'utf8');
const repository = fs.readFileSync(path.join(root, 'api/src/lib/bbvaCollaboratorCertificationRepository.ts'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage.tsx'), 'utf8');

assert.match(migration, /CertificationLevel NVARCHAR\(16\)/);
assert.match(migration, /JR.*STD.*SR.*GENERIC/s);
assert.match(migration, /sp_executesql/);
assert.match(migration, /COL_LENGTH\(N'bbva\.PersonCertification', N'CertificationLevel'\)/);
assert.match(migration, /parent_object_id\s*=\s*OBJECT_ID\(N'bbva\.PersonCertification'\)/);
assert.match(repository, /Selecciona un nivel válido para la certificación tecnológica/);
assert.match(repository, /CertificationLevel=@certificationLevel/);
assert.match(page, /ariaLabel="Nivel de certificación"/);
assert.match(page, /allowedLevels/);

console.log('Nivel independiente de certificación tecnológica V17: OK');
console.log('Migración V17: creación y consumo de CertificationLevel separados por compilación dinámica.');
