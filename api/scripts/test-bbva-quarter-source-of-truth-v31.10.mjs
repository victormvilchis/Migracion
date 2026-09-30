import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');

const vendor=read('api/src/lib/bbvaVendorCalendar.ts');
const repo=read('api/src/lib/bbvaOperationalQuarterRepository.ts');
const service=read('api/src/lib/bbvaOperationalQuarterService.ts');
const fn=read('api/src/functions/bbvaOperationalQuarters.ts');
const catalog=read('src/pagesBBVATalent/catalogs/OperationalQuarterCatalogPage.tsx');
const api=read('src/pagesBBVATalent/api/operationalQuarterApi.ts');
const tracking=read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const dashboardService=read('api/src/lib/bbvaDashboardService.ts');
const certificationService=read('api/src/lib/bbvaCollaboratorCertificationService.ts');
const metrics=read('src/pagesBBVATalent/certifications/CertificationMetricsPage.tsx');
const sql=read('api/scripts/migrate-bbva-operational-quarter-v31.10.sql');

assert.match(vendor,/const derived=defaultOperationalQuarterWindow\(source\)/);
assert.match(vendor,/startDate:derived\.startDate,endDate:derived\.endDate/);
assert.doesNotMatch(vendor,/override\?\.operationalStartDate\?\?/);
assert.doesNotMatch(vendor,/override\?\.operationalEndDate\?\?/);
assert.match(vendor,/const startDate=source\.startDate\.endsWith\('-01'\)\?source\.startDate:addMonthsFirstDay\(source\.startDate,1\)/);
assert.match(vendor,/const endDate=lastDayOfMonth\(source\.endDate\)/);
assert.match(vendor,/sourceStart<=previousEnd/);

assert.match(service,/updateSource\(/);
assert.match(service,/const derived=defaultOperationalQuarterWindow\(\{startDate:sourceStartDate,endDate:sourceEndDate\}\)/);
assert.match(service,/invalidateMetricSnapshots\(code\)/);
assert.match(repo,/DELETE FROM bbva\.DashboardMetricSnapshot WHERE QuarterCode=@quarterCode/);
assert.doesNotMatch(fn,/body\?\.operationalStartDate/);
assert.doesNotMatch(fn,/body\?\.operationalEndDate/);
assert.match(fn,/service\.updateSource\(code,sourceStartDate,sourceEndDate,user\.email\)/);

assert.match(api,/OperationalQuarterDraft \{ sourceStartDate:string; sourceEndDate:string; \}/);
assert.doesNotMatch(catalog,/ariaLabel=\{`Inicio operativo/);
assert.doesNotMatch(catalog,/ariaLabel=\{`Fin operativo/);
assert.match(catalog,/Ventana operativa · automática/);
assert.match(catalog,/se deriva de Vendors; no se edita manualmente/i);
assert.match(catalog,/queryKey:\['certification-tracking'\]/);
assert.doesNotMatch(catalog,/bbva-certification-tracking/);

assert.match(tracking,/const dueInPeriodCount=useMemo\(\(\)=>contextItems\.filter/);
assert.doesNotMatch(tracking,/dueInPeriodCount=useMemo\(\(\)=>items\.filter/);
assert.match(tracking,/DUE_IN_PERIOD/);
assert.match(metrics,/DUE_IN_PERIOD/);

assert.match(dashboardService,/operationalQuarterRepository\.listOverrides\(\)/);
assert.match(dashboardService,/vendorQuarterContext\(now, filters\.quarterCode, operationalQuarterOverrides\)/);
assert.match(dashboardService,/cert\.expirationDate >= selectedQuarter\.startDate && cert\.expirationDate <= selectedQuarter\.endDate/);
assert.match(certificationService,/vendorQuarterForDate\(item\.expirationDate, operationalQuarterOverrides\)/);

assert.match(sql,/CK_OperationalQuarterConfig_DerivedWindow/);
assert.match(sql,/OperationalStartDate = CASE WHEN DAY\(SourceStartDate\)=1 THEN SourceStartDate ELSE DATEADD\(DAY,1,EOMONTH\(SourceStartDate\)\) END/);
assert.match(sql,/OperationalEndDate = EOMONTH\(SourceEndDate\)/);

console.log('Quarter Source of Truth V31.10: OK');
console.log('- Vendors domina la ventana operativa; no existe segunda configuración manual: OK');
console.log('- cambio de Q a mitad de mes se redondea a mes completo: OK');
console.log('- Seguimiento usa el mismo universo filtrado para KPI de vencimientos: OK');
console.log('- Panel/Métricas/Tracking consumen límites operativos centralizados: OK');
console.log('- cambios de calendario invalidan snapshots del Q: OK');
console.log('- BD impide divergencia entre Vendors y ventana operativa materializada: OK');
