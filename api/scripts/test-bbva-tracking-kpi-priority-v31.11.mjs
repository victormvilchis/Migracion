import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const tracking=fs.readFileSync(path.join(root,'src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx'),'utf8');

const section=tracking.match(/<section aria-label="Resumen operativo de seguimiento"[\s\S]*?<\/section>/)?.[0];
assert.ok(section,'No se encontró el resumen operativo de Seguimiento.');

const staticLabels=[...section.matchAll(/<BBVAMetricCard[^>]*label="([^"]+)"/g)].map((match)=>match[1]);
const hasDuePeriod=/<BBVAMetricCard[^>]*label=\{`Vencen en \$\{formatPeriodCode\(effectiveQuarterCode\)\}`\}/.test(section);
assert.equal(hasDuePeriod,true,'Debe conservarse Vencen en periodo.');

const expected=['Próximas a vencer','Pendientes','Vencidas','Reprobadas','Críticos 2/2'];
assert.deepEqual(staticLabels,expected,'El orden de KPIs operativos no coincide con el estándar V31.11.');
assert.equal((section.match(/<BBVAMetricCard/g)??[]).length,6,'Seguimiento debe mostrar exactamente 6 KPIs.');
assert.doesNotMatch(section,/label="Atención requerida"/,'Atención requerida es redundante con Próximas a vencer y no debe mostrarse.');
assert.doesNotMatch(section,/label="Recertificación"/,'Recertificación no debe ocupar una tarjeta principal en Seguimiento.');
assert.doesNotMatch(tracking,/const attentionRequired=/,'No debe mantenerse cálculo muerto de Atención requerida.');
assert.doesNotMatch(tracking,/metricHelp\.attention/,'No debe mantenerse ayuda local muerta de Atención requerida.');
assert.doesNotMatch(tracking,/metricHelp\.recertification/,'No debe mantenerse ayuda local muerta de Recertificación.');

// Los flujos siguen disponibles aunque ya no sean KPI principal.
assert.match(tracking,/RECERTIFICATION_PENDING/,'Recertificación debe seguir disponible como estado/flujo operativo.');
assert.match(tracking,/startRecertification/,'La acción de recertificación debe seguir disponible.');
assert.match(tracking,/critical === 'OPEN'/,'Críticos 2\/2 debe conservar su drill-down.');
assert.match(tracking,/certificationStatus === 'DUE_IN_PERIOD'/,'Vencen en periodo debe conservar su drill-down.');

console.log('Tracking KPI Priority V31.11: OK');
console.log('- Seguimiento reducido de 8 a 6 KPI principales: OK');
console.log('- se conservan Vencen en periodo, Próximas, Pendientes, Vencidas, Reprobadas y Críticos 2/2: OK');
console.log('- Atención requerida y Recertificación salen del tablero sin eliminar sus reglas de dominio: OK');
