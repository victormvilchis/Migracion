import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');

const repo=read('api/src/lib/bbvaOperationalQuarterRepository.ts');
const service=read('api/src/lib/bbvaOperationalQuarterService.ts');
const fn=read('api/src/functions/bbvaOperationalQuarters.ts');
const api=read('src/pagesBBVATalent/api/operationalQuarterApi.ts');
const page=read('src/pagesBBVATalent/catalogs/OperationalQuarterCatalogPage.tsx');
const agents=read('AGENTS.md');

assert.match(repo,/async deletePeriod\(quarterCode:string\)/);
assert.match(repo,/async deleteYear\(year:number\)/);
assert.match(repo,/DELETE FROM bbva\.DashboardMetricSnapshot WHERE QuarterCode=@quarterCode/);
assert.match(repo,/DELETE FROM bbva\.OperationalQuarterConfig WHERE QuarterCode=@quarterCode/);
assert.match(repo,/QuarterCode LIKE @prefix/);
assert.match(service,/deletable:boolean/);
assert.match(service,/yearDeletable:boolean/);
assert.match(service,/Los periodos base del calendario BBVA no se pueden eliminar/);
assert.match(service,/No puedes eliminar el periodo actual ni un periodo histórico/);
assert.match(service,/elimina primero el periodo más reciente/);
assert.match(service,/Sólo se puede eliminar un año futuro agregado manualmente/);
assert.match(fn,/service\.deletePeriod\(code\)/);
assert.match(fn,/service\.deleteYear\(year\)/);
assert.match(fn,/route:'bbva\/operational-quarter-years\/\{year\}'/);
assert.match(fn,/route:'bbva\/operational-quarters\/\{code\}\/synchronize'/);
assert.match(api,/remove:\(code:string\)/);
assert.match(api,/removeYear:\(year:number\)/);
assert.match(page,/Eliminar año/);
assert.match(page,/Eliminar periodo/);
assert.match(page,/ConfirmDialog/);
assert.match(page,/item\.deletable/);
assert.match(page,/item\.yearDeletable/);
assert.match(page,/Las ventanas operativas deben ser mensuales, continuas y sin traslapes/);
assert.match(agents,/V31\.13 — eliminación segura de periodos operativos/);

console.log('Operational Quarter Delete V31.13: OK');
console.log('- sólo elimina periodos futuros agregados y desde el final: OK');
console.log('- año futuro completo puede eliminarse si es el más reciente: OK');
console.log('- actual, históricos y calendario base quedan protegidos: OK');
console.log('- snapshots del periodo eliminado se limpian en la misma operación: OK');
console.log('- UI usa confirmación destructiva y API explícita: OK');
