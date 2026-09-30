import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const css = read('src/index.css');
const explorer = read('src/pagesBBVATalent/staffing/EngineeringSpecialtyExplorerPage.tsx');
const collaborators = read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
const talent = read('src/pagesBBVATalent/talentBank/TalentBankPage.tsx');

// Badges pastel transversales: no deben quedarse con fondos claros en Dark.
for (const token of ['bg-blue-100', 'bg-emerald-100', 'bg-amber-100', 'bg-rose-100', 'bg-sky-50']) {
  assert.match(css, new RegExp(`html\\.dark \\.${token.replace('-', '\\-')}`), `${token}: falta override oscuro.`);
}
for (const token of ['ring-blue-200', 'ring-emerald-200', 'ring-amber-200', 'ring-rose-200']) {
  assert.match(css, new RegExp(`html\\.dark \\.${token.replace('-', '\\-')}`), `${token}: falta override de ring oscuro.`);
}

// Colaboradores: badges de estado semántico con variantes dark explícitas.
assert.match(collaborators, /CRITICAL:[\s\S]*?\[\.bbva-dark_&\]:bg-rose-400\/15/);
assert.match(collaborators, /DOUBLE_TECH:[\s\S]*?\[\.bbva-dark_&\]:bg-emerald-400\/15/);
assert.match(collaborators, /PENDING:[\s\S]*?\[\.bbva-dark_&\]:bg-blue-400\/10/);

// Banco de talento: badge urgente legible en Dark.
assert.match(talent, /Urgente · \+60 días/);
assert.match(talent, /\[\.bbva-dark_&\]:bg-rose-400\/15[\s\S]*?\[\.bbva-dark_&\]:text-rose-200/);

// Explorer: tarjetas seleccionadas, heatmap e insights no dependen de superficies claras.
assert.match(explorer, /heatToneClass/);
assert.match(explorer, /\[\.bbva-dark_&\]:bg-cyan-400\/20/);
assert.match(explorer, /\[\.bbva-dark_&\]:bg-blue-400\/15/);
assert.match(explorer, /\[\.bbva-dark_&\]:bg-cyan-500\/10/);
assert.match(explorer, /\[\.bbva-dark_&\]:from-cyan-400\/10/);
assert.match(explorer, /\[\.bbva-dark_&\]:to-blue-500\/10/);
assert.match(explorer, /\[\.bbva-dark_&\]:from-slate-900/);
assert.match(explorer, /\[\.bbva-dark_&\]:to-blue-500\/10/);
assert.match(explorer, /\[\.bbva-dark_&\]:from-amber-400\/10/);
assert.match(explorer, /\[\.bbva-dark_&\]:bg-slate-950\/55/);
assert.doesNotMatch(explorer, /bg-(?:blue|cyan|emerald|amber|rose)-400\/(?:8|12|18)/);
assert.doesNotMatch(explorer, /from-cyan-400\/(?:8|12|18)|hover:bg-cyan-400\/(?:8|12|18)/);

console.log('BBVA Dark Contrast V31.16a: OK');
console.log('- badges pastel y rings tienen contraste Dark transversal: OK');
console.log('- Colaboradores y Talento conservan badges semánticos legibles: OK');
console.log('- Gremios/Especialidades cubre jerarquía, heatmap e insights en Dark: OK');
