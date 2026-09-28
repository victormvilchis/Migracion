import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, '..');

async function connectionString() {
  const fromEnv = String(process.env.AZURE_SQL_CONNECTION_STRING ?? '').trim();
  if (fromEnv) return fromEnv;

  let settings;
  try {
    settings = JSON.parse(await readFile(path.join(apiDir, 'local.settings.json'), 'utf8'));
  } catch (error) {
    throw new Error(`No se encontró AZURE_SQL_CONNECTION_STRING ni fue posible leer api/local.settings.json: ${error instanceof Error ? error.message : String(error)}`);
  }

  const value = String(settings?.Values?.AZURE_SQL_CONNECTION_STRING ?? '').trim();
  if (!value) throw new Error('api/local.settings.json no contiene Values.AZURE_SQL_CONNECTION_STRING.');
  return value;
}

const migration = await readFile(path.join(scriptDir, 'migrate-bbva-analytics-v20.sql'), 'utf8');
const pool = await sql.connect(await connectionString());
try {
  await pool.request().batch(migration);
  console.log('Analytics V20 aplicado: índices de actividad e histórico listos.');
} finally {
  await pool.close();
}
