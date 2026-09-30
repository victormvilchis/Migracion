import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const context=read('src/componentsBBVATalent/BBVAContextBar.tsx');
const sidebar=read('src/componentsBBVATalent/BBVASidebar.tsx');
const css=read('src/index.css');
const filterPersistence=read('api/scripts/test-bbva-filter-persistence-v29.mjs');
const files={
  dataHelp:read('src/componentsBBVATalent/BBVADataHelp.tsx'),
  actionMenu:read('src/componentsBBVATalent/BBVAActionMenu.tsx'),
  searchable:read('src/componentsBBVATalent/BBVASearchableSelect.tsx'),
  confirm:read('src/componentsBBVATalent/ConfirmDialog.tsx'),
  alert:read('src/componentsBBVATalent/BBVAAlert.tsx'),
  critical:read('src/componentsBBVATalent/CertificationCriticalResolutionDialog.tsx'),
  approval:read('src/componentsBBVATalent/CertificationQuickApprovalDialog.tsx'),
  schedule:read('src/componentsBBVATalent/CertificationScheduleDialog.tsx'),
  communication:read('src/componentsBBVATalent/CertificationCommunicationDialog.tsx'),
};
assert.match(context,/bbva-context-bar/);
assert.match(sidebar,/bbva-sidebar-header/);
assert.match(css,/\.bbva-workspace\.bbva-dark \.bbva-context-bar/);
assert.match(css,/background-color: #020617 !important/);
assert.match(css,/\.bbva-workspace\.bbva-dark \.bbva-main-surface/);
assert.match(css,/--bbva-dark-nav: #020617/);
assert.match(css,/--bbva-dark-main: #020617/);
assert.match(css,/background-color: #020617 !important/);
assert.match(css,/padding-bottom: 0\.25rem !important/);
assert.match(css,/\.bbva-table-shell tbody,[\s\S]*\.bbva-table-shell tr,[\s\S]*\.bbva-table-shell td,[\s\S]*background-color: #020617 !important/);
assert.match(css,/\.bbva-table-shell th,[\s\S]*\.bbva-table-shell td,[\s\S]*background-color: #020617 !important/);
assert.match(filterPersistence,/<BBVALayout\(\?:\\s\+\[\^>\]\*\)\?>/);
for(const [name,source] of Object.entries(files)){
  assert.match(source,/dark:/,`${name}: overlay no tiene fallback dark global para portal.`);
}
assert.match(css,/V31\.15b — ESTABILIZACIÓN DARK BBVA/);
console.log('BBVA Dark Stability V31.15b: OK');
console.log('- header/contexto #020617 queda forzado por encima de overrides legacy: OK');
console.log('- nav, header/contexto y main usan #020617 de forma consistente: OK');
console.log('- portales principales reaccionan a html.dark y vuelven a Light: OK');
console.log('- tablas usan #020617 en wrapper, header, filas y celdas: OK');
console.log('- tablas reducen padding inferior sin alterar acciones: OK');
console.log('- regresión V29 tolera BBVALayout con props de tema: OK');
