import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx'), 'utf8');

assert.match(source, /<details className="group relative inline-block text-left">/);
assert.match(source, />\s*Acciones\s*<ChevronDown/);
assert.match(source, /Continuar baja/);
assert.match(source, />\{item\.scheduledDate \? 'Reprogramar' : 'Programar'\}<\/button>/);
assert.match(source, />Aprobar<\/button>/);
assert.match(source, />Recertificar<\/button>/);
assert.match(source, />Ver detalle<\/button>/);
assert.match(source, /closest\('details'\)\?\.removeAttribute\('open'\)/);

assert.doesNotMatch(
  source,
  /<div className="flex flex-wrap justify-end gap-1\.5">[\s\S]*?>Programar<\/BBVAButton>[\s\S]*?>Aprobar<\/BBVAButton>/,
  'Seguimiento no debe volver a mostrar multiples botones inline en Acciones.'
);

console.log('BBVA Tracking Actions Dropdown V31.27b: OK');
console.log('- Acciones se compactan en un unico dropdown: OK');
console.log('- Programar/Reprogramar, Aprobar, Recertificar, Resolver/Continuar baja y Ver detalle se conservan: OK');
console.log('- el menu se cierra antes de ejecutar la accion: OK');
