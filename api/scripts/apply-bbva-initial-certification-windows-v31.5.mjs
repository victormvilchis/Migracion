import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';
const here=path.dirname(fileURLToPath(import.meta.url));
const settingsPath=path.resolve(here,'..','local.settings.json');
const settings=fs.existsSync(settingsPath)?JSON.parse(fs.readFileSync(settingsPath,'utf8')):{};
const connectionString=process.env.AZURE_SQL_CONNECTION_STRING||settings?.Values?.AZURE_SQL_CONNECTION_STRING;
if(!connectionString)throw new Error('No se encontró AZURE_SQL_CONNECTION_STRING.');
const script=fs.readFileSync(path.join(here,'migrate-bbva-initial-certification-windows-v31.5.sql'),'utf8');
const pool=await sql.connect(connectionString);
try{await pool.request().batch(script);console.log('Ventanas iniciales de certificación V31.5 aplicadas.');}finally{await pool.close();}
