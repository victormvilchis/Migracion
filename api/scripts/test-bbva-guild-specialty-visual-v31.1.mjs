import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const explorer = read('src/pagesBBVATalent/staffing/EngineeringSpecialtyExplorerPage.tsx');
const agents = read('AGENTS.md');

assert.match(explorer, /heatToneClass/);
assert.doesNotMatch(explorer, /intensityClass/);
assert.match(explorer, /Cuadrícula por Nivel 2 y Nivel 3/);
assert.match(explorer, /grid-cols-\[190px_minmax\(0,1fr\)\]/);
assert.match(explorer, /Gremios \/ nivel 3/);
assert.match(explorer, /bg-blue-100 border-blue-300/);
assert.doesNotMatch(explorer, /bg-blue-700 text-white/);
assert.doesNotMatch(explorer, /bg-blue-500 text-white/);
assert.doesNotMatch(explorer, /from-slate-950 via-blue-950 to-slate-900/);
assert.doesNotMatch(explorer, /from-slate-950 to-slate-900/);
assert.match(explorer, /EXPLORADOR ORGANIZACIONAL/);
assert.match(explorer, /bg-white px-3 py-2 shadow-sm/);
assert.match(explorer, /aside className="bg-slate-50\/70/);
assert.match(agents, /V31\.1 — refinamiento visual del explorador/);

console.log('Gremios y Especialidades Visual Refinement V31.1: OK');
console.log('- heatmap convertido a cuadrícula N2/N3: OK');
console.log('- paleta clara BBVA sin bloques saturados: OK');
console.log('- selector de vistas y panel lateral homologados al look & feel: OK');
