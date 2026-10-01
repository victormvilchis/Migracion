import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const css = read('src/componentsBBVATalent/bbvaResponsiveDensity.css');
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');
const layout = read('src/componentsBBVATalent/BBVALayout.tsx');
const sidebar = read('src/componentsBBVATalent/BBVASidebar.tsx');
const collaborators = read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
const collaboratorCertifications = read('src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage.tsx');
const tracking = read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');

assert.match(layout, /import '\.\/bbvaResponsiveDensity\.css';/);
assert.match(layout, /data-workspace="bbva"/);
assert.match(css, /\.bbva-workspace\[data-workspace='bbva'\]/);
assert.doesNotMatch(cssRules, /(^|[\s,{])(?:html|body|#root)(?=[\s.{:#\[])/m);
assert.doesNotMatch(cssRules, /\bzoom\s*:/i);
assert.doesNotMatch(cssRules, /transform\s*:\s*scale/i);

for (const breakpoint of ['1600px', '1440px', '1366px', '1280px']) {
  assert.ok(css.includes(`max-width: ${breakpoint}`), `Missing ${breakpoint} breakpoint`);
}

for (const token of [
  '--bbva-density-page-x',
  '--bbva-density-control-height',
  '--bbva-density-table-font',
  '--bbva-density-row-height',
  '--bbva-density-sidebar-width',
  '--bbva-density-tracking-min-width',
]) {
  assert.ok(css.includes(token), `Missing density token ${token}`);
}

assert.match(sidebar, /bbva-sidebar--expanded/);
assert.match(sidebar, /bbva-sidebar--collapsed/);
assert.match(sidebar, /bbva-sidebar-group/);
assert.match(sidebar, /bbva-sidebar-link/);

assert.match(collaborators, /bbva-collaborators-page/);
assert.match(collaborators, /bbva-collaborator-filters/);
assert.match(collaborators, /bbva-collaborators-table/);
assert.match(collaborators, /label="Colaborador"/);
assert.match(collaborators, /label="Perfil \/ tecnología"/);
assert.match(collaborators, />Estructura BBVA</);
assert.match(collaborators, /label="DM"/);
assert.match(collaborators, /label="Estado"/);
assert.match(collaborators, />Acciones</);

assert.match(collaboratorCertifications, /bbva-collaborator-certifications-page/);
assert.match(collaboratorCertifications, /bbva-density-metrics/);
assert.match(collaboratorCertifications, /bbva-collaborator-certifications-table/);
assert.match(tracking, /bbva-certification-tracking-page/);
assert.match(tracking, /bbva-tracking-table/);

console.log('BBVA Responsive Density V31.23: OK');
console.log('- scope exclusivo .bbva-workspace[data-workspace="bbva"]: OK');
console.log('- sin zoom, transform scale, body/html/#root: OK');
console.log('- breakpoints 1600 / 1440 / 1366 / 1280: OK');
console.log('- Colaboradores conserva columnas prioritarias y compacta tabla/filtros: OK');
console.log('- Detalle de certificaciones compacta métricas/filtros/tabla: OK');
console.log('- Sidebar usa ancho y filas responsive scoped a BBVA: OK');
