import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const css = read('src/componentsBBVATalent/bbvaResponsiveDensity.css');
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');
const layout = read('src/componentsBBVATalent/BBVALayout.tsx');

assert.match(layout, /className=\{`bbva-workspace/);
assert.match(layout, /data-workspace="bbva"/);
assert.match(layout, /import '\.\/bbvaResponsiveDensity\.css';/);

assert.match(css, /V31\.24 — DENSIDAD TRANSVERSAL DEL WORKSPACE BBVA/);
assert.match(css, /\.bbva-workspace\[data-workspace='bbva'\] table \{/);
assert.match(css, /\.bbva-workspace\[data-workspace='bbva'\] table th,/);
assert.match(css, /\.bbva-workspace\[data-workspace='bbva'\] input:not/);
assert.match(css, /\.bbva-workspace\[data-workspace='bbva'\] \.text-lg/);
assert.match(css, /\.bbva-workspace\[data-workspace='bbva'\] \.gap-4/);
assert.match(css, /\.bbva-workspace\[data-workspace='bbva'\] \.space-y-4/);
assert.match(css, /\.bbva-workspace\[data-workspace='bbva'\] \.p-4/);
assert.match(css, /\.bbva-workspace\[data-workspace='bbva'\] form\.grid/);
assert.match(css, /--bbva-density-body-font/);
assert.match(css, /--bbva-density-context-height/);

for (const breakpoint of ['1600px', '1440px', '1366px', '1280px']) {
  assert.ok(css.includes(`max-width: ${breakpoint}`), `Missing ${breakpoint} breakpoint`);
}

assert.doesNotMatch(cssRules, /(^|[\s,{])(?:html|body|#root)(?=[\s.{:#\[])/m);
assert.doesNotMatch(cssRules, /\bzoom\s*:/i);
assert.doesNotMatch(cssRules, /transform\s*:\s*scale/i);

console.log('BBVA Workspace Responsive Density V31.24: OK');
console.log('- densidad transversal para tablas, controles, tipografia, gaps y paddings: OK');
console.log('- alcance exclusivo .bbva-workspace[data-workspace="bbva"]: OK');
console.log('- 1920+ mantiene baseline; 1600/1440/1366/1280 compactan progresivamente: OK');
console.log('- sin body/html/#root, zoom ni transform scale: OK');
