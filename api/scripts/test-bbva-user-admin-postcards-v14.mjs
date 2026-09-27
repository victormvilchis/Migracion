import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderCertificationPostcardPng } from '../dist/lib/bbvaCertificationPostcardRenderer.js';

const migration = fs.readFileSync(new URL('./migrate-bbva-users-postcards-v14.sql', import.meta.url), 'utf8');
const userRepo = fs.readFileSync(new URL('../src/lib/bbvaUserAdminRepository.ts', import.meta.url), 'utf8');
const collaboratorForm = fs.readFileSync(new URL('../../src/componentsBBVATalent/CollaboratorForm.tsx', import.meta.url), 'utf8');
const importPage = fs.readFileSync(new URL('../../src/pagesBBVATalent/collaborators/CollaboratorImportPage.tsx', import.meta.url), 'utf8');
const dialog = fs.readFileSync(new URL('../../src/componentsBBVATalent/CertificationCommunicationDialog.tsx', import.meta.url), 'utf8');
const attemptPage = fs.readFileSync(new URL('../../src/pagesBBVATalent/collaboratorCertifications/CertificationAttemptPage.tsx', import.meta.url), 'utf8');

assert.match(migration, /CREATE TABLE bbva\.SystemUser\s*\(/);
assert.match(migration, /CREATE TABLE bbva\.SystemRole\s*\(/);
assert.match(migration, /DELIVERY_MANAGER/);
assert.match(migration, /CertificationPostcardTemplate/);
assert.match(migration, /Version\s*,?2|p\.Context,2/);
assert.match(userRepo, /r\.IsDeliveryManager=1/);
assert.match(userRepo, /Reasigna los colaboradores antes de inactivar/);
assert.match(collaboratorForm, /useDeliveryManagers/);
assert.match(collaboratorForm, /BBVASearchableSelect/);
assert.match(importPage, /Seleccionar Delivery Manager/);
assert.doesNotMatch(importPage, /Delivery Manager<\/div><input/);
assert.match(dialog, /text-slate-900 placeholder:text-slate-400/);
assert.doesNotMatch(dialog, /La integración con Outlook aún no está configurada/);
assert.doesNotMatch(attemptPage, /La postal es opcional/);

const png = renderCertificationPostcardPng({
  eyebrow: 'CERTIFICACIÓN COMPLETADA',
  title: '¡Felicidades, Cinthia!',
  message: 'Has aprobado Normativa & Testing. Reconocemos tu preparación y el compromiso demostrado durante este proceso.',
  fullName: 'CINTHIA CRISTINA HERNANDEZ HERNANDEZ',
  certificationName: 'NORMATIVA & TESTING',
  resultLabel: 'APROBADO',
  attemptLabel: '1 / 3',
  dateLabel: '2026-09-27',
  accent: '#1464A5',
});
assert.deepEqual([...png.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
assert.ok(png.length > 15000, 'La postal corporativa debe contener suficiente información gráfica.');
console.log('OK: módulo Usuarios/DM y postal corporativa V14 verificados.');
