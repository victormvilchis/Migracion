import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migration = fs.readFileSync(path.join(here, 'migrate-bbva-quarter-experience-v23.sql'), 'utf8');

assert.match(migration, /DECLARE @dropPkSql NVARCHAR\(MAX\)/);
assert.match(migration, /SET @dropPkSql = N'ALTER TABLE bbva\.DashboardMetricSnapshot DROP CONSTRAINT ' \+ QUOTENAME\(@pkName\)/);
assert.match(migration, /EXEC sys\.sp_executesql @dropPkSql/);
assert.doesNotMatch(migration, /EXEC\(N'ALTER TABLE bbva\.DashboardMetricSnapshot DROP CONSTRAINT ' \+ QUOTENAME/);
assert.match(migration, /PRIMARY KEY \(SnapshotDate,QuarterCode\)/);
assert.match(migration, /SET QuarterCode=N''GLOBAL''/);

console.log('Quarter migration V23.1: OK');
console.log('- DROP CONSTRAINT usa SQL dinámico materializado + sp_executesql: OK');
console.log('- migración conserva QuarterCode y PK SnapshotDate+QuarterCode: OK');
