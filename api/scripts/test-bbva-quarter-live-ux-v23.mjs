import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vendorQuarterContext, vendorQuarterByCode, BBVA_VENDOR_QUARTERS } from '../dist/lib/bbvaVendorCalendar.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

// Q: sólo calendario configurado, current Q y selección explícita por año/Q.
const current = vendorQuarterContext(new Date('2026-09-28T12:00:00-06:00'));
assert.equal(current.currentQuarter?.code, '2026Q4');
assert.equal(current.selectedQuarter?.code, '2026Q4');
assert.equal(current.referenceDate, '2026-09-28');
const q3Close = vendorQuarterContext(new Date('2026-09-28T04:30:00.000Z'));
assert.equal(q3Close.currentQuarter?.code, '2026Q3');
assert.equal(q3Close.selectedQuarter?.code, '2026Q3');
assert.equal(q3Close.targetQuarter?.code, '2026Q4', 'La preparación al siguiente Q debe seguir siendo retrocompatible.');
assert.equal(q3Close.daysToTargetStart, 1);
assert.equal(q3Close.daysToSelectedEnd, 0);
assert.equal(vendorQuarterByCode('2026q3')?.code, '2026Q3');
assert.equal(vendorQuarterByCode('2027Q1'), null, 'No se deben inventar Q no configurados.');
assert.deepEqual([...new Set(BBVA_VENDOR_QUARTERS.map((q) => q.year))], [2026]);

const dashboard = read('src/pagesBBVATalent/dashboard/BBVADashboardPage.tsx');
const metrics = read('src/pagesBBVATalent/certifications/CertificationMetricsPage.tsx');
const tracking = read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const talent = read('src/pagesBBVATalent/talentBank/TalentBankPage.tsx');
const talentRepo = read('api/src/lib/bbvaTalentRepository.ts');
const roleEditor = read('src/pagesBBVATalent/admin/AdminRoleEditorPage.tsx');
const roleDomain = read('api/src/lib/bbvaUserAdminDomain.ts');
const roleRepo = read('api/src/lib/bbvaUserAdminRepository.ts');
const migration = read('api/scripts/migrate-bbva-quarter-experience-v23.sql');
const css = read('src/index.css');
const standards = read('AGENTS.md');

// Panel y Métricas: Q visible/seleccionable, filtros primarios y vencimientos del Q siempre visibles.
for (const source of [dashboard, metrics]) {
  assert.doesNotMatch(source, /BBVAQuarterSelector/);
  assert.match(source, /ariaLabel="Periodo"/);
  assert.match(source, /quarterCode/);
  assert.match(source, /Estructura nivel 2/);
  assert.match(source, /Estructura nivel 3/);
  assert.match(source, /quarterExpirations/);
}
assert.match(dashboard, /cards=\{5\}/);
assert.match(metrics, /cards=\{5\}/);
assert.match(dashboard, /El periodo seleccionado define vigencia, vencimientos y métricas/);
assert.match(metrics, /Vigencia, cobertura y vencimientos responden al periodo seleccionado/);

// V24 simplifica Seguimiento: Q operativo en filtro/columna, sin duplicar Estructura ni Postal.
assert.match(tracking, /quarterCode/);
assert.match(tracking, />Periodo<\/th>/);
assert.doesNotMatch(tracking, /Estructura BBVA/);
assert.doesNotMatch(tracking, />Postal<\/BBVAButton>/);

// Banco de talento: urgencia determinística por más de 60 días sin asignación.
assert.match(talentRepo, /daysInTalentBank > 60/);
assert.doesNotMatch(talentRepo, /talentBankEntryCount > 2/);
assert.match(talent, /Urgente · \+60 días/);

// Catálogos/roles: código técnico no forma parte del contrato de alta/edición ni de la UI.
assert.doesNotMatch(roleEditor, /Código/);
assert.doesNotMatch(roleDomain, /BbvaSystemRolePayload[\s\S]*?code:/);
assert.doesNotMatch(roleRepo, /AS code,r\.Name AS name/);
assert.match(roleRepo, /CUSTOM_/); // clave interna inmutable para compatibilidad/seguridad.

// Migración segura: QuarterCode se crea/consume en batches dinámicos y snapshots quedan segmentados por Q.
assert.match(migration, /sp_executesql/);
assert.match(migration, /QuarterCode/);
assert.match(migration, /PRIMARY KEY \(SnapshotDate,QuarterCode\)/);
assert.match(migration, /SET QuarterCode=N''GLOBAL''/);

// Movimiento sutil y accesible.
assert.match(css, /\.bbva-live-card/);
assert.match(css, /prefers-reduced-motion/);
assert.match(standards, /MAYÚSCULAS/);
assert.match(standards, /nunca exponen códigos editables/);
assert.match(standards, /Más de 60 días/);

console.log('Quarter + Live UX V23: OK');
console.log('- Periodo actual/selector anual y vencimientos por periodo: OK');
console.log('- Seguimiento simplificado con periodo y sin estructura/postal: OK');
console.log('- Banco de talento con urgencia >60 días: OK');
console.log('- catálogos sin código editable/expuesto: OK');
console.log('- casing corporativo y microinteracciones accesibles: OK');
