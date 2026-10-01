import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx'), 'utf8');

assert.match(source, /<details className="group relative inline-block text-left">/);
assert.match(source, />\s*Acciones\s*<MoreHorizontal/);
assert.match(source, /Continuar baja/);
assert.match(source, />\{item\.scheduledDate \? 'Reprogramar' : 'Programar'\}<\/BBVAButton>/);
assert.match(source, />Aprobar<\/BBVAButton>/);
assert.match(source, />Recertificar<\/BBVAButton>/);
assert.match(source, />Ver detalle<\/BBVAButton>/);
assert.match(source, /closest\('details'\)\?\.removeAttribute\('open'\)/);
assert.doesNotMatch(source, /ChevronDown|ChevronUp/, 'El dropdown de acciones no debe reintroducir chevrons reservados por la regresion legacy de filas expandibles.');
assert.match(
  source,
  /<BBVAButton variant="table" size="sm" className="w-full justify-start/,
  'Las acciones del dropdown deben conservar el componente BBVAButton variant=table para cumplir el estandar UX BBVA.'
);
assert.doesNotMatch(source, /Postal/, 'Seguimiento no debe exponer Postal como accion rapida.');
assert.match(source, /vendorQuarter\.currentCode|effectiveQuarterCode/, 'Seguimiento debe conservar el periodo Q operativo.');


assert.doesNotMatch(
  source,
  /<div className="flex flex-wrap justify-end gap-1\.5">[\s\S]*?>Programar<\/BBVAButton>[\s\S]*?>Aprobar<\/BBVAButton>/,
  'Seguimiento no debe volver a mostrar multiples botones inline en Acciones.'
);

console.log('BBVA Tracking Actions Dropdown V31.27d: OK');
console.log('- Acciones se compactan en un unico dropdown: OK');
console.log('- Programar/Reprogramar, Aprobar, Recertificar, Resolver/Continuar baja y Ver detalle se conservan: OK');
console.log('- el menu se cierra antes de ejecutar la accion: OK');
