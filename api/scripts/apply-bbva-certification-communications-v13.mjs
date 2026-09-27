import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, '..');

async function connectionString() {
  const fromEnv = String(process.env.AZURE_SQL_CONNECTION_STRING ?? '').trim();
  if (fromEnv) return fromEnv;

  const settingsPath = path.join(apiDir, 'local.settings.json');
  let settings;
  try {
    settings = JSON.parse(await readFile(settingsPath, 'utf8'));
  } catch {
    throw new Error('No se encontró AZURE_SQL_CONNECTION_STRING ni fue posible leer api/local.settings.json.');
  }
  const value = String(settings?.Values?.AZURE_SQL_CONNECTION_STRING ?? '').trim();
  if (!value) throw new Error('api/local.settings.json no contiene Values.AZURE_SQL_CONNECTION_STRING.');
  return value;
}

const migrationPath = path.join(scriptDir, 'migrate-bbva-certification-communications-v13.sql');
const migration = await readFile(migrationPath, 'utf8');
const pool = await sql.connect(await connectionString());
try {
  await pool.request().batch(migration);
  console.log('OK: migración BBVA V13 de comunicaciones/certificaciones aplicada.');
} finally {
  await pool.close();
}
