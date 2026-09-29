import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const pagination = read('src/componentsBBVATalent/BBVAPagination.tsx');
const collaborators = read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
const tracking = read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const metrics = read('src/pagesBBVATalent/certifications/CertificationMetricsPage.tsx');
const agents = read('AGENTS.md');

// Paginación corporativa: la página activa debe ser inequívoca y accesible.
assert.match(pagination, /!bg-blue-600/);
assert.match(pagination, /!text-white/);
assert.match(pagination, /ring-2 ring-blue-100/);
assert.match(pagination, /aria-current=\{active \? 'page' : undefined\}/);
assert.equal((pagination.match(/BBVASearchableSelect/g) ?? []).length >= 2, true);

// Colaboradores: el conteo de certificaciones deja de ocupar una columna de la vista principal.
assert.doesNotMatch(collaborators, /label="Certificaciones"/);
assert.doesNotMatch(collaborators, /cubiertas \/ aplicables/);
assert.match(collaborators, /label="Estado"/);
assert.match(collaborators, /id:'certifications',label:'Certificaciones'/); // sigue disponible como acción.
assert.match(collaborators, /colSpan=\{8\}/);

// Headers de tablas sin repetir el módulo ni conteos que ya muestra la paginación.
assert.doesNotMatch(tracking, />Certificaciones por atender</);
assert.doesNotMatch(tracking, /registros en el contexto actual/);
assert.match(tracking, /ariaLabel="Periodo de vencimiento"/);
assert.match(tracking, />Actualizar<\/BBVAButton>/);

assert.doesNotMatch(metrics, />Métricas por periodo</);
assert.doesNotMatch(metrics, /Vigencia, cobertura y vencimientos responden al periodo seleccionado/);
assert.doesNotMatch(metrics, /Listado completo del periodo seleccionado para los filtros actuales/);
assert.doesNotMatch(metrics, /Incluye estructura BBVA nivel 2 y 3/);
assert.doesNotMatch(metrics, /Certificaciones que vencen en \{formatPeriodCode/); // V30.2: las tablas no usan headers auxiliares.

// Estándar documentado para módulos presentes y futuros.
assert.match(agents, /V30 — tablas limpias y paginación orientativa/);
assert.match(agents, /no repiten el nombre del módulo/);
assert.match(agents, /La vista principal de Colaboradores no muestra una columna de conteo `Certificaciones`/);
assert.match(agents, /aria-current="page"/);

console.log('UX de tablas BBVA V30: OK');
console.log('- headers sin redundancia de módulo ni conteos duplicados: OK');
console.log('- columna Certificaciones retirada de Colaboradores sin quitar la acción: OK');
console.log('- página activa de paginación claramente resaltada y accesible: OK');
console.log('- estándar transversal documentado para módulos actuales y futuros: OK');
