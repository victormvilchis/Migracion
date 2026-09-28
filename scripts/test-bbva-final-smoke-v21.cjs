const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tests = [
  'api/scripts/test-bbva-quarter-business-v24.mjs',
  'api/scripts/test-bbva-quarter-live-ux-v23.mjs',
  'api/scripts/test-bbva-final-audit-v21.mjs',
  'api/scripts/test-bbva-authoritative-field-mapping-v22.mjs',
  'api/scripts/test-bbva-quality-reconciliation-v20.2.mjs',
  'api/scripts/test-bbva-analytics-v20.mjs',
  'api/scripts/test-bbva-business-checkpoint-v19.mjs',
  'api/scripts/test-bbva-certification-communications.mjs',
  'api/scripts/test-bbva-vendor-quarter-v17.mjs',
  'api/scripts/test-bbva-certification-level-v17.mjs',
  'api/scripts/test-bbva-collaborator-critical-query-v18.mjs',
  'api/scripts/test-bbva-collaborator-import-identity.mjs',
  'api/scripts/test-bbva-collaborator-import-certifications.mjs',
  'api/scripts/test-bbva-collaborator-import-sql-guard.mjs',
  'api/scripts/test-bbva-user-admin-postcards-v14.mjs',
  'api/scripts/test-bbva-ux-standards-v15.mjs',
  'api/scripts/test-bbva-analytics-runner-v20.1.mjs',
  'scripts/test-bbva-import-parser-guard.cjs',
  'scripts/test-bbva-integrated-v10.cjs',
  'scripts/test-bbva-critical-ux-v9.cjs',
];

for (const relative of tests) {
  process.stdout.write(`\n== ${relative} ==\n`);
  const run = spawnSync(process.execPath, [path.join(root, relative)], { cwd: root, stdio: 'inherit' });
  if (run.status !== 0) process.exit(run.status || 1);
}
console.log('\nSmoke/regresión BBVA V24: OK');
