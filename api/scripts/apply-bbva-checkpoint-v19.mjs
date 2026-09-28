import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, '..');

async function connectionString() {
  const fromEnv = String(process.env.AZURE_SQL_CONNECTION_STRING ?? '').trim();
  if (fromEnv) return fromEnv;
  const settings = JSON.parse(await readFile(path.join(apiDir, 'local.settings.json'), 'utf8'));
  const value = String(settings?.Values?.AZURE_SQL_CONNECTION_STRING ?? '').trim();
  if (!value) throw new Error('No se encontró AZURE_SQL_CONNECTION_STRING.');
  return value;
}

const migration = await readFile(path.join(scriptDir, 'migrate-bbva-checkpoint-v19.sql'), 'utf8');
const pool = await sql.connect(await connectionString());
try {
  await pool.request().batch(migration);
  console.log('Checkpoint V19 aplicado: resoluciones críticas e histórico KPI listos.');
} finally {
  await pool.close();
}
