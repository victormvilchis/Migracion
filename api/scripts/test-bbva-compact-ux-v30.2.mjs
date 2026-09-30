import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');

const roles=read('src/pagesBBVATalent/admin/AdminRolesPage.tsx');
const roleEditor=read('src/pagesBBVATalent/admin/AdminRoleEditorPage.tsx');
const users=read('src/pagesBBVATalent/admin/AdminUsersPage.tsx');
const dashboard=read('src/pagesBBVATalent/dashboard/BBVADashboardPage.tsx');
const metrics=read('src/pagesBBVATalent/certifications/CertificationMetricsPage.tsx');
const tracking=read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const reports=read('src/pagesBBVATalent/reports/BBVAReportsPage.tsx');
const collaboratorCerts=read('src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage.tsx');
const importPage=read('src/pagesBBVATalent/collaborators/CollaboratorImportPage.tsx');
const requiredMark=read('src/componentsBBVATalent/BBVARequiredMark.tsx');
const filterBar=read('src/componentsBBVATalent/BBVAFilterBar.tsx');
const agents=read('AGENTS.md');

// El badge describe el rol; la capacidad DM permanece como configuración independiente.
assert.match(roles,/roleInitials/);
assert.match(roles,/words\.slice\(0,3\).*charAt\(0\)/s);
assert.doesNotMatch(roles,/isDeliveryManager\s*\?[^:\n]*DM/);
assert.match(roleEditor,/isDeliveryManager/);
assert.match(roleEditor,/Disponible para asignación como Delivery Manager/);

// Asterisco obligatorio corporativo rojo y reutilizable.
assert.match(requiredMark,/text-rose-600/);
assert.match(requiredMark,/>\*<\/span>/);
for (const rel of [
  'src/componentsBBVATalent/CollaboratorForm.tsx',
  'src/componentsBBVATalent/TalentForm.tsx',
  'src/componentsBBVATalent/CatalogForm.tsx',
  'src/componentsBBVATalent/CertificationCatalogForm.tsx',
  'src/pagesBBVATalent/admin/AdminRoleEditorPage.tsx',
  'src/pagesBBVATalent/admin/AdminUserEditorPage.tsx',
  'src/pagesBBVATalent/catalogs/StructureCatalogEditorPage.tsx',
  'src/pagesBBVATalent/staffing/EngineeringSpecialtyEditorPage.tsx',
  'src/pagesBBVATalent/collaborators/CollaboratorMoveToTalentPage.tsx',
  'src/pagesBBVATalent/talentBank/TalentConvertPage.tsx',
  'src/pagesBBVATalent/collaboratorCertifications/CertificationAttemptPage.tsx',
]) assert.match(read(rel),/BBVARequiredMark/,`${rel} debe usar BBVARequiredMark`);

// Filtros compactos, sin card contenedora y con acciones integradas.
assert.match(filterBar,/flex flex-wrap items-center gap-2/);
assert.doesNotMatch(filterBar,/border-slate|rounded-2xl|bg-slate-50/);
for (const source of [dashboard,metrics,reports,users,roles,collaboratorCerts]) assert.match(source,/BBVAFilterBar/);
assert.match(tracking,/placeholder=\"Buscar colaborador\.\.\.\"/);
assert.match(tracking,/ariaLabel=\"Tecnología o certificación\"/);
assert.doesNotMatch(dashboard,/Vista operativa|VISTA OPERATIVA|Preparación Vendors\. El periodo seleccionado/);
assert.doesNotMatch(metrics,/Métricas por periodo|Vigencia, cobertura y vencimientos responden/);
assert.match(dashboard,/actions=\{<>.*Actualizar.*Limpiar/s);
assert.match(metrics,/actions=\{<>.*Actualizar.*Limpiar/s);
assert.match(tracking,/>Actualizar<\/BBVAButton>/s);
assert.match(tracking,/>Limpiar<\/BBVAButton>/s);

// Tablas separadas de filtros y sin headers descriptivos redundantes.
assert.doesNotMatch(reports,/Snapshots del periodo|Una fila por día capturado/);
assert.doesNotMatch(metrics,/Certificaciones que vencen en/);
assert.doesNotMatch(tracking,/>Certificaciones por atender</);
assert.match(collaboratorCerts,/<BBVAFilterBar(?:\s+actions=\{[\s\S]*?\})?>[\s\S]*?<section className="overflow-visible rounded-xl border/);

// Toda página BBVA con tabla incorpora la paginación corporativa.
const pageRoot=path.join(root,'src/pagesBBVATalent');
const walk=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
const tablePages=walk(pageRoot).filter((file)=>file.endsWith('.tsx')&&fs.readFileSync(file,'utf8').includes('<table'));
const missingPagination=tablePages.filter((file)=>!fs.readFileSync(file,'utf8').includes('BBVAPagination')).map((file)=>path.relative(root,file));
assert.deepEqual(missingPagination,[]);
assert.match(reports,/pagedSnapshotRows/);
assert.match(collaboratorCerts,/const paged = filtered\.slice/);
assert.match(importPage,/pagedPossibleLows/);
assert.match(metrics,/safeScorePage/);
assert.match(metrics,/safeAttentionPage/);

assert.match(agents,/V30\.2 — forms y tablas compactas como estándar BBVA/);
assert.match(agents,/Service Manager` → `SM/);
assert.match(agents,/BBVARequiredMark/);
assert.match(agents,/Colaboradores y Banco de talento son la referencia visual/);

console.log('UX compacta transversal BBVA V30.2: OK');
console.log('- badge de rol usa iniciales del rol y no la capacidad DM: OK');
console.log('- asteriscos obligatorios rojos y estándar reutilizable: OK');
console.log('- filtros compactos sin card envolvente y acciones integradas: OK');
console.log('- tablas sin headers redundantes y con paginación estándar: OK');
