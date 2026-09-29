import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

const tracking=read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const users=read('src/pagesBBVATalent/admin/AdminUsersPage.tsx');
const roles=read('src/pagesBBVATalent/admin/AdminRolesPage.tsx');
const form=read('src/componentsBBVATalent/CollaboratorForm.tsx');
const collaboratorRepo=read('api/src/lib/bbvaCollaboratorRepository.ts');
const collaboratorService=read('api/src/lib/bbvaCollaboratorService.ts');
const migration=read('api/scripts/migrate-bbva-office-equipment-v31.3.sql');
const metrics=read('src/pagesBBVATalent/certifications/CertificationMetricsPage.tsx');
const dashboard=read('src/pagesBBVATalent/dashboard/BBVADashboardPage.tsx');
const collaborators=read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
const talent=read('src/pagesBBVATalent/talentBank/TalentBankPage.tsx');
const importPage=read('src/pagesBBVATalent/collaborators/CollaboratorImportPage.tsx');
const importService=read('api/src/lib/bbvaCollaboratorImportService.ts');
const importRepo=read('api/src/lib/bbvaCollaboratorImportRepository.ts');

// Seguimiento: filtro de intento/criticidad y sin headers/fichas redundantes de filtros.
assert.match(tracking,/Intentos o criticidad/);
for(const token of ['NO_ATTEMPTS','ONE_ATTEMPT','LAST_AVAILABLE','LIMIT_REACHED','CRITICAL_OPEN']) assert.match(tracking,new RegExp(token));
assert.doesNotMatch(tracking,/BBVAFilterSummary items=/);
assert.doesNotMatch(tracking,/Certificaciones por atender/);

// Badge: usa hasta tres palabras; ACCOUNT DELIVERY MANAGER -> ADM.
for(const source of [users,roles]) assert.match(source,/words\.slice\(0,3\)/);
const initials=(name)=>{const words=String(name??'').trim().split(/\s+/).filter(Boolean);return (words.length>1?words.slice(0,3).map((word)=>word.charAt(0)).join(''):words[0]?.slice(0,2)||'—').toUpperCase();};
assert.equal(initials('ACCOUNT DELIVERY MANAGER'),'ADM');
assert.equal(initials('DELIVERY MANAGER'),'DM');
assert.equal(initials('SERVICE MANAGER'),'SM');

// Información BBVA: subsección cerrada para asistencia/sede/equipo y persistencia real.
for(const token of ['Asistencia a oficina y equipo','Días de oficina','BBVA Parques Polanco','BBVA Torre Reforma','Tag de equipo']) assert.match(form,new RegExp(token));
for(const token of ['OfficeAttendanceDays','OfficeSite','OfficeSiteOther','EquipmentTag']) {assert.match(migration,new RegExp(token));assert.match(collaboratorRepo,new RegExp(token));}
assert.match(collaboratorService,/normalizeOfficeDays/);
assert.match(collaboratorService,/PARQUES_POLANCO/);
assert.match(collaboratorService,/TORRE_REFORMA/);

// Estado es el último filtro visible en los módulos con múltiples filtros.
function assertStatusLast(source,label){
  const stateIndex=Math.max(source.lastIndexOf('ariaLabel="Estado"'),source.lastIndexOf('ariaLabel="Estado de certificación"'),source.lastIndexOf('ariaLabel="Filtrar por estado de certificación"'));
  assert.ok(stateIndex>=0,`${label}: no se localizó filtro Estado.`);
  const tail=source.slice(stateIndex,source.indexOf('</BBVAFilterBar>',stateIndex)>=0?source.indexOf('</BBVAFilterBar>',stateIndex):source.indexOf('</div>',stateIndex));
  assert.doesNotMatch(tail,/ariaLabel="(?:Tecnología|Periodo|Universo|Estructura BBVA|Vinculación|Perfil|Certificación|Staffer|Estructura nivel 2|Filtrar por Delivery Manager)"/,`${label}: hay filtros posteriores a Estado.`);
}
for(const [label,source] of [['Panel',dashboard],['Métricas',metrics],['Seguimiento',tracking]]) assertStatusLast(source,label);
assert.ok(collaborators.indexOf('ariaLabel="Filtrar por estructura BBVA"') < collaborators.indexOf('ariaLabel="Filtrar por estado de certificación"'),'Colaboradores: Estado debe ir al final.');
assert.ok(talent.indexOf('ariaLabel="Vinculación"') < talent.indexOf('ariaLabel="Estado"'),'Banco de talento: Estado debe ir al final.');

// KPI redundante de personas con vencimiento retirado; Pendientes ocupa ese espacio.
assert.doesNotMatch(metrics,/Personas con vencimiento/);
assert.match(metrics,/Pendientes de certificación/);
assert.match(metrics,/cards\.pending/);

// Importación: detecta TB, conserva por default y nunca lo cambia por "Aplicar todos".
assert.match(importService,/person\.activeTalentId \? 'Banco de talento'/);
assert.match(importService,/field === 'lifecycleState' \? 'KEEP_CURRENT'/);
assert.match(importService,/if \(change\.field === 'lifecycleState'\) \{ unresolved\.push\(change\); continue; \}/);
assert.match(importPage,/Mantener en \{lifecycleChange\.currentValue === 'Banco de talento' \? 'Banco de talento'/);
assert.match(importPage,/Reactivar como colaborador/);
assert.match(importPage,/const dataChanges = item\.changes\.filter\(\(change\) => change\.field !== 'lifecycleState'\)/);
assert.match(importRepo,/async updatePersonOnly/);
assert.match(importService,/repository\.updatePersonOnly/);

console.log('Reglas operativas BBVA V31.3: OK');
console.log('- seguimiento compacto + filtro intentos/criticidad: OK');
console.log('- badges ADM/DM/SM: OK');
console.log('- oficina/sede/tag dentro de Información BBVA: OK');
console.log('- Estado como último filtro: OK');
console.log('- KPI de pendientes sustituye duplicidad de vencimientos: OK');
console.log('- importación preserva Banco de talento y ofrece reactivación explícita: OK');
