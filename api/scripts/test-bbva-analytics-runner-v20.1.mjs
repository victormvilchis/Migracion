import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..', '..');
const runner = fs.readFileSync(path.join(root, 'api/scripts/apply-bbva-analytics-v20.mjs'), 'utf8');

assert.doesNotMatch(runner, /from ['"]dotenv['"]/);
assert.match(runner, /AZURE_SQL_CONNECTION_STRING/);
assert.match(runner, /local\.settings\.json/);
assert.match(runner, /migrate-bbva-analytics-v20\.sql/);
assert.match(runner, /Analytics V20 aplicado: índices de actividad e histórico listos\./);
console.log('Analytics V20.1 runner: OK');
