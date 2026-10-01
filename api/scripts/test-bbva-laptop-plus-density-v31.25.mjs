import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const layout = read('src/componentsBBVATalent/BBVALayout.tsx');
const css = read('src/componentsBBVATalent/bbvaResponsiveDensity.css');
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');

assert.match(layout, /useLocation/);
assert.match(layout, /data-bbva-density-profile=\{isTalentBankRoute \? 'talent-bank-ultra' : highDensityDesktopRoute \? 'compact-plus' : 'standard'\}/);
assert.match(layout, /\/bbva\\\/collaborators/);
assert.match(layout, /isTalentBankRoute\s*=\s*\/\^\\\/bbva\\\/talent-bank/);
assert.match(layout, /certifications\\\/tracking/);
assert.match(layout, /certifications\\\/metrics/);

assert.match(css, /V31\.25 — DENSIDAD LAPTOP PLUS/);
assert.match(css, /data-bbva-density-profile='compact-plus'/);
assert.match(css, /max-height: 900px/);
assert.match(css, /max-height: 820px/);
assert.match(css, /max-height: 768px/);
assert.match(css, /--bbva-density-row-height: 28px/);
assert.match(css, /--bbva-density-sidebar-width: 158px/);
assert.match(css, /--bbva-density-tracking-min-width: 850px/);

assert.doesNotMatch(cssRules, /\bzoom\s*:/i);
assert.doesNotMatch(cssRules, /transform\s*:\s*scale/i);
assert.doesNotMatch(cssRules, /(^|[\s,{])(?:html|body|#root)(?=[\s.{:#\[])/m);

console.log('BBVA Laptop Plus Density V31.25: OK');
console.log('- Colaboradores, Seguimiento y Metricas conservan compact-plus por ruta: OK');
console.log('- Banco de talento puede usar un perfil mas denso sin romper compact-plus: OK');
console.log('- densidad responde a ancho y alto util del viewport: OK');
console.log('- 1366x768 / <=768px usa densidad reforzada sin zoom/scale: OK');
console.log('- scope permanece exclusivamente dentro de .bbva-workspace: OK');
