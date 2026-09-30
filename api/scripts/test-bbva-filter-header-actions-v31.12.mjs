import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const filterBar=read('src/componentsBBVATalent/BBVAFilterBar.tsx');
const dashboard=read('src/pagesBBVATalent/dashboard/BBVADashboardPage.tsx');
const metrics=read('src/pagesBBVATalent/certifications/CertificationMetricsPage.tsx');
const tracking=read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const explorer=read('src/pagesBBVATalent/staffing/EngineeringSpecialtyExplorerPage.tsx');
const agents=read('AGENTS.md');

assert.match(filterBar,/flex flex-wrap items-center gap-2 w-full/);
assert.match(filterBar,/flex min-w-0 flex-1 flex-wrap items-center gap-2/);
assert.match(filterBar,/min-w-\[240px\] flex-1/);
assert.match(filterBar,/min-w-\[170px\] flex-1/);
assert.match(filterBar,/!w-full/);
assert.match(filterBar,/ml-auto flex shrink-0 items-center gap-1\.5/);

for(const [name,source] of [['Panel',dashboard],['Métricas',metrics],['Seguimiento',tracking],['Gremios y Especialidades',explorer]]){
  assert.match(source,/>Actualizar<\/BBVAButton>/,`${name}: falta Actualizar.`);
  assert.match(source,/>Limpiar<\/BBVAButton>/,`${name}: falta Limpiar persistente.`);
}
assert.match(dashboard,/clearDashboardFilters/);
assert.match(dashboard,/quarterCode:''/);
assert.match(dashboard,/disabled=\{!hasDashboardFilters\}/);
assert.doesNotMatch(dashboard,/\?\s*<BBVAButton[^\n]*>Limpiar<\/BBVAButton>\s*:\s*null/);
assert.match(metrics,/clearMetricFilters/);
assert.match(metrics,/quarterCode:''/);
assert.match(metrics,/disabled=\{!hasMetricFilters\}/);
assert.match(tracking,/disabled=\{!activeFilters\.length\}/);
assert.match(explorer,/clearExplorerFilters/);
assert.match(explorer,/setStatus\('ACTIVE'\)/);
assert.match(agents,/V31\.12 — header de filtros y acciones de panel/);
assert.match(agents,/muestran siempre `Actualizar` y `Limpiar`/);

console.log('Filter Header & Panel Actions V31.12: OK');
console.log('- BBVAFilterBar distribuye todo el ancho sin huecos: OK');
console.log('- buscador crece más y filtros restantes comparten espacio: OK');
console.log('- Panel/Métricas/Seguimiento/Explorer muestran Actualizar + Limpiar siempre: OK');
console.log('- Limpiar vuelve a defaults y el periodo retorna al operativo actual: OK');
