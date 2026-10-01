import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const quarterPath = path.join(root, 'src/pagesBBVATalent/catalogs/OperationalQuarterCatalogPage.tsx');
const talentPath = path.join(root, 'src/pagesBBVATalent/talentBank/TalentBankPage.tsx');
const quarter = fs.readFileSync(quarterPath, 'utf8');
const talent = fs.readFileSync(talentPath, 'utf8');

// V31.14 intent: Vendors can overlap while the operational calendar stays continuous.
assert.match(quarter, /Vendors[^\n]*pueden traslaparse/i, 'Debe conservarse la explicación de traslape de Vendors.');
assert.match(quarter, /ventanas operativas[^\n]*continuas[^\n]*sin traslapes/i, 'La ventana operativa debe seguir siendo continua y sin traslapes.');

// V31.18 supersedes the old "editable" labels with explicit date meaning.
assert.doesNotMatch(quarter, /Ventana Vendors\s*·\s*editable/i, 'El copy legacy "editable" ya no debe exigirse.');
assert.doesNotMatch(quarter, /Ventana operativa\s*·\s*editable/i, 'El copy legacy "editable" ya no debe exigirse.');
assert.match(quarter, /Ventana Vendors\s*·\s*Inicio\s*→\s*fin/, 'Vendors debe identificar inicio y fin.');
assert.match(quarter, /Ventana operativa \(KPIs\)\s*·\s*Inicio\s*→\s*fin/, 'La ventana operativa debe identificar inicio/fin y KPIs.');
assert.match(quarter, /no gobierna KPIs/i, 'Debe quedar claro que Vendors es solo referencia.');
assert.match(quarter, /gobiernan KPIs, vencimientos y seguimiento/i, 'Debe quedar claro qué fechas gobiernan la operación.');

// Talent UX checks introduced around V31.14 remain covered.
assert.match(talent, /daysInTalentBank/, 'Banco de talento debe conservar días de permanencia.');
assert.match(talent, /urgentAssignment/, 'Banco de talento debe conservar señal de urgencia.');
assert.match(talent, /Ver CV/, 'Banco de talento debe conservar acción Ver CV.');
assert.match(talent, /Descargar CV/, 'Banco de talento debe conservar acción Descargar CV.');

console.log('BBVA Quarter overlap + Talent UX V31.14 compatible con V31.18c: OK');
console.log('- Vendors puede traslaparse y operativo sigue continuo: OK');
console.log('- copy legacy "editable" sustituido por inicio/fin y propósito: OK');
console.log('- UX de Banco de talento preservada: OK');
