import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const searchable = read('src/componentsBBVATalent/BBVASearchableSelect.tsx');
const multi = read('src/componentsBBVATalent/BBVAMultiSelect.tsx');
const structure = read('src/componentsBBVATalent/BBVAStructureFilter.tsx');
const filterBar = read('src/componentsBBVATalent/BBVAFilterBar.tsx');
const metric = read('src/componentsBBVATalent/BBVAMetricCard.tsx');
const help = read('src/componentsBBVATalent/BBVADataHelp.tsx');
const metricHelp = read('src/componentsBBVATalent/bbvaMetricHelp.ts');
const chart = read('src/componentsBBVATalent/BBVAChartCard.tsx');
const insight = read('src/componentsBBVATalent/BBVAInsightCard.tsx');
const collaborators = read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
const display = read('src/pagesBBVATalent/lib/bbvaDisplayFormat.ts');
const sidebar = read('src/componentsBBVATalent/BBVASidebar.tsx');
const contextBar = read('src/componentsBBVATalent/BBVAContextBar.tsx');

// Dropdowns portaleados: el panel abierto hacia arriba queda pegado al trigger usando su altura real.
for (const [name, source] of [['SearchableSelect', searchable], ['MultiSelect', multi], ['StructureFilter', structure]]) {
  assert.match(source, /useLayoutEffect/, `${name}: debe medir el panel ya renderizado.`);
  assert.match(source, /getBoundingClientRect\(\)\.height/, `${name}: debe medir altura real.`);
  assert.match(source, /visiblePanelHeight/, `${name}: la posición superior debe usar la altura visible real.`);
  assert.doesNotMatch(source, /rect\.top - maxHeight - 6/, `${name}: no debe separar el dropdown usando maxHeight teórico.`);
}

// Barra de filtros: ocupa todo el ancho y el buscador absorbe espacio sobrante.
assert.match(filterBar, /flex flex-wrap items-center gap-2 w-full/);
assert.match(filterBar, /containsSearchField/);
assert.match(filterBar, /min-w-\[240px\] flex-1/);

// Toda tarjeta KPI tiene ayuda informativa, incluso si el módulo no pasa definición explícita.
assert.match(metric, /defaultMetricHelp/);
assert.match(metric, /<BBVADataHelp label=\{label\} content=\{resolvedHelp\}/);
assert.match(help, /Qué afecta el valor/);
assert.match(metricHelp, /El valor responde al universo y a los filtros activos del módulo/);
assert.match(metricHelp, /críticos 2\/2/);
assert.match(metricHelp, /cobertura de colaboradores/);
assert.match(metricHelp, /banco de talento/);

// Gráficas e insights también explican qué muestran y de qué contexto dependen.
assert.match(chart, /BBVADataHelp/);
assert.match(insight, /BBVADataHelp/);
assert.match(insight, /Insight determinístico/);

// Colaboradores: el perfil se muestra completo como en Banco de talento.
assert.match(display, /compactRoleDisplayForTable/);
assert.match(display, /ANALISTA PROGRAMADOR/);
assert.match(display, /DATA ENG\./);
assert.match(display, /DEV/);
assert.doesNotMatch(collaborators, /compactRoleDisplayForTable/);
assert.match(collaborators, /line-clamp-2[\s\S]*displayRoleName\(roleDisplay\(item\.profile,item\.technologyProfile\)\)/);
assert.match(collaborators, /upperDisplay\(technologyDisplay\(item\.currentTechnology,item\.expertise\)\)/);
assert.match(collaborators, /title=\{`\$\{displayRoleName/);

// Esquina de BBVA Workspace y breadcrumb: misma altura de 40px.
assert.match(sidebar, /flex h-10 items-center border-b/);
assert.match(contextBar, /flex h-10 w-full items-center border-b/);

console.log('Claridad operativa BBVA V31.4: OK');
console.log('- selects alineados al trigger con altura real: OK');
console.log('- filtros ocupan todo el ancho y buscador crece: OK');
console.log('- KPI, gráficas e insights con ayuda informativa transversal: OK');
console.log('- Perfil completo en Colaboradores alineado a Banco de talento: OK');
console.log('- BBVA Workspace alineado con header/breadcrumb: OK');
