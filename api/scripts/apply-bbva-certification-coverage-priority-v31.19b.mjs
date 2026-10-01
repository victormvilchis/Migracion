import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';

const here = path.dirname(fileURLToPath(import.meta.url));
const settingsPath = path.resolve(here, '..', 'local.settings.json');
const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : {};
const connectionString = process.env.AZURE_SQL_CONNECTION_STRING || settings?.Values?.AZURE_SQL_CONNECTION_STRING;
if (!connectionString) throw new Error('No se encontró AZURE_SQL_CONNECTION_STRING.');

const scriptPath = path.join(here, 'migrate-bbva-certification-coverage-priority-v31.19b.sql');
const script = fs.readFileSync(scriptPath, 'utf8');
const pool = await sql.connect(connectionString);
try {
  await pool.request().batch(script);
  const check = await pool.request().query(`
    SELECT
      COL_LENGTH(N'bbva.PersonCertification', N'CoverageGroupId') AS CoverageGroupIdLength,
      COL_LENGTH(N'bbva.PersonCertification', N'CoveragePriority') AS CoveragePriorityLength,
      CASE WHEN EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name=N'UX_BBVA_PersonCertification_CoverageSlot'
          AND object_id=OBJECT_ID(N'bbva.PersonCertification')
      ) THEN 1 ELSE 0 END AS HasCoverageSlotIndex;
  `);
  const row = check.recordset?.[0];
  if (!row?.CoverageGroupIdLength || !row?.CoveragePriorityLength || row?.HasCoverageSlotIndex !== 1) {
    throw new Error('La migración terminó, pero la validación de columnas/índice de cobertura no pasó.');
  }
  console.log('Prioridad de cobertura de certificaciones V31.19b aplicada y validada.');
} finally {
  await pool.close();
}
