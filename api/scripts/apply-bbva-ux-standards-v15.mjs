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
  const settings = JSON.parse(await readFile(settingsPath, 'utf8'));
  const value = String(settings?.Values?.AZURE_SQL_CONNECTION_STRING ?? '').trim();
  if (!value) throw new Error('No se encontró la conexión SQL local configurada para la API.');
  return value;
}

const migration = await readFile(path.join(scriptDir, 'migrate-bbva-ux-standards-v15.sql'), 'utf8');
const pool = await sql.connect(await connectionString());
try {
  await pool.request().batch(migration);
  console.log('OK: migración BBVA V15 de estándares UX y español de México aplicada.');
} finally {
  await pool.close();
}
