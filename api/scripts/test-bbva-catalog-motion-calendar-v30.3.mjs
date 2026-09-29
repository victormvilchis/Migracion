import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');

const catalogPages=[
  'src/pagesBBVATalent/catalogs/CatalogListPage.tsx',
  'src/pagesBBVATalent/catalogs/CatalogEditorPage.tsx',
  'src/pagesBBVATalent/catalogs/CatalogDetailPage.tsx',
  'src/pagesBBVATalent/catalogs/StructureCatalogPage.tsx',
  'src/pagesBBVATalent/catalogs/StructureCatalogEditorPage.tsx',
  'src/pagesBBVATalent/catalogs/StructureCatalogDetailPage.tsx',
  'src/pagesBBVATalent/staffing/EngineeringSpecialtyListPage.tsx',
  'src/pagesBBVATalent/staffing/EngineeringSpecialtyEditorPage.tsx',
  'src/pagesBBVATalent/staffing/EngineeringSpecialtyDetailPage.tsx',
  'src/pagesBBVATalent/certifications/CertificationCatalogListPage.tsx',
  'src/pagesBBVATalent/certifications/CertificationCatalogEditorPage.tsx',
  'src/pagesBBVATalent/certifications/CertificationCatalogDetailPage.tsx',
];
for(const rel of catalogPages){
  const source=read(rel);
  assert.match(source,/BBVACatalogHeader/,`${rel} debe mostrar header contextual de catálogo`);
}
const catalogHeader=read('src/componentsBBVATalent/BBVACatalogHeader.tsx');
assert.match(catalogHeader,/ADMINISTRACIÓN · CATÁLOGOS/);

const users=read('src/pagesBBVATalent/admin/AdminUsersPage.tsx');
const roles=read('src/pagesBBVATalent/admin/AdminRolesPage.tsx');
assert.match(users,/upperDisplay\(item\.fullName\)/);
assert.match(users,/roleInitials\(r\.name\)/);
assert.match(roles,/upperDisplay\(item\.name\)/);
assert.match(roles,/roleInitials\(item\.name\)/);

const datePicker=read('src/components/common/DatePicker.tsx');
assert.match(datePicker,/const year = maxYear - index/);
assert.doesNotMatch(datePicker,/const year = minYear \+ index/);
assert.match(datePicker,/if \(next && !selected\)/);
assert.match(datePicker,/today\.getFullYear\(\)/);

const metricCard=read('src/componentsBBVATalent/BBVAMetricCard.tsx');
const insightCard=read('src/componentsBBVATalent/BBVAInsightCard.tsx');
const metrics=read('src/pagesBBVATalent/certifications/CertificationMetricsPage.tsx');
const css=read('src/index.css');
assert.doesNotMatch(metricCard,/bbva-live-card/);
assert.doesNotMatch(metrics,/bbva-live-card/);
assert.match(insightCard,/bbva-insight-live/);
assert.match(css,/\.bbva-insight-live/);
assert.match(css,/bbva-insight-breathe/);
assert.match(css,/prefers-reduced-motion/);
assert.doesNotMatch(css,/\.bbva-live-card\s*\{[\s\S]*animation:/);
assert.doesNotMatch(css,/\.bbva-live-panel\s*\{[\s\S]*animation:/);

const agents=read('AGENTS.md');
assert.match(agents,/Todo módulo ubicado bajo \*\*Administración > Catálogos\*\* muestra `BBVACatalogHeader`/);
assert.match(agents,/más nuevo al más viejo/);
assert.match(agents,/movimiento continuo se reserva exclusivamente a \*\*insights y recomendaciones analíticas\*\*/);

console.log('Contexto de catálogos, motion y calendarios BBVA V30.3: OK');
console.log('- todos los módulos de Catálogos usan header contextual: OK');
console.log('- Usuarios y Roles con casing/initials corporativos: OK');
console.log('- tarjetas operativas estáticas; insights/recomendaciones dinámicos: OK');
console.log('- años de calendario descendentes y contexto actual por default: OK');
