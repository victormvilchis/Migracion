import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';

const here = path.dirname(fileURLToPath(import.meta.url));
const settingsPath = path.resolve(here, '..', 'local.settings.json');
const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : {};
const connectionString = process.env.AZURE_SQL_CONNECTION_STRING || settings?.Values?.AZURE_SQL_CONNECTION_STRING;
if (!connectionString) throw new Error('No se encontró AZURE_SQL_CONNECTION_STRING.');

const script = fs.readFileSync(path.join(here, 'migrate-bbva-certification-coverage-groups-v31.20.sql'), 'utf8');
const pool = await sql.connect(connectionString);
try {
  await pool.request().batch(script);
  const result = await pool.request().query(`
    SELECT
      CASE WHEN EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name=N'CK_BBVA_PersonCertification_CoveragePriority'
          AND parent_object_id=OBJECT_ID(N'bbva.PersonCertification')
          AND definition LIKE N'%255%'
      ) THEN 1 ELSE 0 END AS HasUnlimitedOrderConstraint,
      CASE WHEN EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name=N'UX_BBVA_PersonCertification_CoverageSlot'
          AND object_id=OBJECT_ID(N'bbva.PersonCertification')
      ) THEN 1 ELSE 0 END AS HasCoverageOrderIndex;
  `);
  const row = result.recordset?.[0];
  if (row?.HasUnlimitedOrderConstraint !== 1 || row?.HasCoverageOrderIndex !== 1) {
    throw new Error('La migración V31.20 terminó, pero la validación de cobertura tecnológica no pasó.');
  }
  console.log('Cobertura tecnológica V31.20 aplicada y validada.');
} finally {
  await pool.close();
}
