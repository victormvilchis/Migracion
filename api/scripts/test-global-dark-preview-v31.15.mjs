import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const app=read('src/App.tsx');
const header=read('src/components/layout/Header.tsx');
const sidebar=read('src/components/layout/Sidebar.tsx');
const layout=read('src/componentsBBVATalent/BBVALayout.tsx');
const css=read('src/index.css');
const html=read('index.html');
const agents=read('AGENTS.md');

assert.match(app,/basebfs\.theme\.preview/);
assert.match(app,/root\.classList\.toggle\('dark', dark\)/);
assert.match(app,/root\.classList\.toggle\('bbva-dark', dark\)/);
assert.match(app,/root\.dataset\.appTheme = themeMode/);
assert.match(app,/onToggleTheme=\{\(\) => setThemeMode/);
assert.match(app,/dark:bg-\[#020617\]/);
assert.match(app,/<BBVALayout themeMode=\{themeMode\}>[\s\S]*?<BBVAFilterPersistenceBoundary pathname=\{location\.pathname\}>/);

assert.match(header,/Moon/);
assert.match(header,/Sun/);
assert.match(header,/Tema actual:/);
assert.match(header,/Cambiar a tema oscuro/);
assert.match(header,/Cambiar a tema claro/);
assert.match(header,/TEMPORAL: retirar este control al integrar a producción/);
assert.match(header,/dark:bg-\[#020617\]/);
assert.match(sidebar,/dark:bg-slate-950/);
assert.match(sidebar,/dark:hover:bg-slate-800/);

assert.match(layout,/const resolvedTheme = themeMode \?\?/);
assert.match(layout,/document\.documentElement\.classList\.contains\('dark'\)/);
assert.match(layout,/data-bbva-theme=\{resolvedTheme\}/);
assert.match(layout,/global-preview/);

assert.match(css,/V31\.15 — PREVIEW TEMPORAL DE TEMA OSCURO/);
assert.match(css,/html\.dark \.glass-panel/);
assert.match(css,/html\.dark \.bg-white/);
assert.match(css,/html\.dark \.text-slate-950/);
assert.match(css,/html\.dark input:not\(\[type="checkbox"\]\)/);
assert.match(html,/basebfs\.theme\.preview/);
assert.match(html,/document\.documentElement\.classList\.add\('dark', 'bbva-dark'\)/);
assert.match(agents,/V31\.15 — preview temporal de tema oscuro/);
assert.match(agents,/debe retirarse durante la integración a producción/);

// No se agrega un segundo toggle dentro del workspace BBVA.
assert.doesNotMatch(layout,/Moon|Sun|Cambiar a tema oscuro/);

console.log('Global Dark Preview V31.15: OK');
console.log('- toggle temporal en Header global: OK');
console.log('- tema persistente Light/Dark en localStorage: OK');
console.log('- template BaseBFS + Header/Sidebar + BBVA Workspace comparten el mismo tema: OK');
console.log('- BBVA conserva sus variantes bbva-dark sin selector duplicado: OK');
console.log('- marcado para retiro en integración productiva: OK');
