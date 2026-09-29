import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';
const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const settingsPath=path.resolve(scriptDir,'..','local.settings.json');
const settings=fs.existsSync(settingsPath)?JSON.parse(fs.readFileSync(settingsPath,'utf8')):{};
const connectionString=process.env.AZURE_SQL_CONNECTION_STRING||settings?.Values?.AZURE_SQL_CONNECTION_STRING;
if(!connectionString)throw new Error('No se encontró AZURE_SQL_CONNECTION_STRING.');
const script=fs.readFileSync(path.join(scriptDir,'migrate-bbva-office-equipment-v31.3.sql'),'utf8');
const pool=await sql.connect(connectionString);try{await pool.request().batch(script);console.log('Oficina y equipo V31.3 aplicados.');}finally{await pool.close();}
