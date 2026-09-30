import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pagePath = path.join(root, 'src/pagesBBVATalent/catalogs/OperationalQuarterCatalogPage.tsx');
const page = fs.readFileSync(pagePath, 'utf8');

assert.doesNotMatch(page, /·\s*editable/i, 'No debe mostrarse "editable" en las ventanas de fechas.');
assert.match(page, /Ventana Vendors\s*·\s*Inicio\s*→\s*fin/, 'Vendors debe aclarar el orden inicio/fin.');
assert.match(page, /Ventana operativa \(KPIs\)\s*·\s*Inicio\s*→\s*fin/, 'La ventana operativa debe aclarar que gobierna KPIs y el orden inicio/fin.');
assert.match(page, /Referencia Vendors \(solo informativa, no gobierna KPIs\)\s*·\s*inicio\s*→\s*fin:/, 'La referencia Vendors debe explicar su finalidad.');
assert.match(page, /Estas fechas gobiernan KPIs, vencimientos y seguimiento\. Sugerencia Vendors\s*·\s*inicio\s*→\s*fin:/, 'La ventana operativa debe explicar su impacto.');

console.log('Claridad de periodos BBVA V31.18: OK');
console.log('- se elimina "editable": OK');
console.log('- Vendors distingue inicio/fin y queda como referencia informativa: OK');
console.log('- Ventana operativa distingue inicio/fin y explica que gobierna KPIs: OK');
