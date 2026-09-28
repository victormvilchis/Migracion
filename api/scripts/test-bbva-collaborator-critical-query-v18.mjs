import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..', '..');
const repository = fs.readFileSync(path.join(root, 'api/src/lib/bbvaCollaboratorRepository.ts'), 'utf8');

assert.match(repository, /OUTER APPLY\s*\(\s*SELECT COUNT\(1\) AS failedAttemptCount[\s\S]*?\) attemptStats/);
assert.match(repository, /ISNULL\(attemptStats\.failedAttemptCount,0\) >= 2/);
assert.doesNotMatch(
  repository,
  /COUNT\(CASE[\s\S]*?\(SELECT COUNT\(1\) FROM bbva\.PersonCertificationAttempt ca[\s\S]*?THEN 1 END\) AS criticalCount/,
  'criticalCount no debe contener una subconsulta dentro del agregado COUNT',
);

console.log('Consulta crítica de colaboradores V18: OK');
