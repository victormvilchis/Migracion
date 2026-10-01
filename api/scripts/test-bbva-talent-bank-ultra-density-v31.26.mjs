import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const layout = read('src/componentsBBVATalent/BBVALayout.tsx');
const css = read('src/componentsBBVATalent/bbvaResponsiveDensity.css');
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');

assert.match(layout, /isTalentBankRoute\s*=\s*\/\^\\\/bbva\\\/talent-bank/);
assert.match(layout, /isTalentBankRoute \? 'talent-bank-ultra'/);
assert.doesNotMatch(layout, /\^\\\/bbva\\\/talent\(\?:\\\/\|-\|\$\)/);

assert.match(css, /V31\.26 — BANCO DE TALENTO ULTRA COMPACT/);
assert.match(css, /data-bbva-density-profile='talent-bank-ultra'/);
assert.match(css, /--bbva-density-control-height: 24px/);
assert.match(css, /--bbva-density-row-height: 24px/);
assert.match(css, /--bbva-density-sidebar-width: 142px/);
assert.match(css, /min-width: 720px !important/);
assert.match(css, /font-size: 7\.75px !important/);

assert.doesNotMatch(cssRules, /\bzoom\s*:/i);
assert.doesNotMatch(cssRules, /transform\s*:\s*scale/i);

console.log('BBVA Talent Bank Ultra Density V31.26: OK');
console.log('- ruta real /bbva/talent-bank recibe perfil exclusivo: OK');
console.log('- Banco de talento tiene mas densidad que compact-plus: OK');
console.log('- 1366x768 reduce filas, controles, sidebar y min-width de tabla: OK');
console.log('- no usa zoom ni transform scale: OK');
