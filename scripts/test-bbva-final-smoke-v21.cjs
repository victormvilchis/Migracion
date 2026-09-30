const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tests = [
  'api/scripts/test-bbva-tracking-kpi-priority-v31.11.mjs',

  'api/scripts/test-bbva-quarter-source-of-truth-v31.10.mjs',

  'api/scripts/test-bbva-multiyear-filters-v31.9.mjs',
  'api/scripts/test-bbva-operational-quarter-v31.8.mjs',
  'api/scripts/test-bbva-live-recommendation-carousel-v31.7.mjs',
  'api/scripts/test-bbva-adaptive-table-recommendations-v31.6a.mjs',
  'api/scripts/test-bbva-initial-certification-windows-v31.5.mjs',
  'api/scripts/test-bbva-operational-clarity-v31.4.mjs',
  'api/scripts/test-bbva-operational-rules-v31.3.mjs',
  'api/scripts/test-bbva-operational-polish-v31.2.mjs',
  'api/scripts/test-bbva-guild-specialty-visual-v31.1.mjs',
  'api/scripts/test-bbva-guild-specialty-explorer-v31.mjs',
  'api/scripts/test-bbva-operational-ux-v30.4.mjs',
  'api/scripts/test-bbva-catalog-motion-calendar-v30.3.mjs',
  'api/scripts/test-bbva-compact-ux-v30.2.mjs',
  'api/scripts/test-bbva-context-headers-v30.1.mjs',
  'api/scripts/test-bbva-table-ux-v30.mjs',
  'api/scripts/test-bbva-filter-persistence-v29.mjs',
  'api/scripts/test-bbva-collaborator-tech-status-v28.mjs',
  'api/scripts/test-bbva-dead-code-v27b.mjs',
  'api/scripts/test-bbva-import-mapping-v17.mjs',
  'api/scripts/test-bbva-mexican-name-v17.mjs',
  'api/scripts/test-bbva-quarter-migration-v23.1.mjs',
  'api/scripts/test-bbva-operational-catalogs-v26.mjs',
  'api/scripts/test-bbva-quarter-operational-v25.mjs',
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
console.log('\nSmoke/regresión BBVA V31.11: OK');
