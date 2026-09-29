import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');

const users=read('src/pagesBBVATalent/admin/AdminUsersPage.tsx');
const roles=read('src/pagesBBVATalent/admin/AdminRolesPage.tsx');
const userEditor=read('src/pagesBBVATalent/admin/AdminUserEditorPage.tsx');
const roleEditor=read('src/pagesBBVATalent/admin/AdminRoleEditorPage.tsx');
const dashboard=read('src/pagesBBVATalent/dashboard/BBVADashboardPage.tsx');
const reports=read('src/pagesBBVATalent/reports/BBVAReportsPage.tsx');
const catalog=read('src/pagesBBVATalent/catalogs/StructureCatalogPage.tsx');
const specialties=read('src/pagesBBVATalent/staffing/EngineeringSpecialtyListPage.tsx');
const agents=read('AGENTS.md');

assert.doesNotMatch(users,/>Administración<|>Usuarios<|Directorio interno para responsables/);
assert.match(users,/Nuevo usuario/);
assert.doesNotMatch(roles,/>Administración<|>Roles<|Perfiles de operación disponibles/);
assert.match(roles,/Nuevo rol/);
assert.doesNotMatch(userEditor,/Administración de usuarios|Editar usuario|Nuevo usuario/);
assert.doesNotMatch(roleEditor,/Administración de roles|Editar rol|Nuevo rol|Los catálogos BBVA se administran/);
assert.doesNotMatch(dashboard,/Vista operativa|Preparación Vendors\. El periodo seleccionado/);
assert.doesNotMatch(reports,/Reportes BBVA|\{config\.title\}|\{config\.description\}/);

// Catálogos sí conservan contexto visible del catálogo.
assert.match(catalog,/ESTRUCTURAS BBVA/);
assert.match(specialties,/GREMIOS Y ESPECIALIDADES/);
assert.match(agents,/Sólo los módulos bajo \*\*Administración > Catálogos\*\* mantienen headers de contexto/);

console.log('Headers de contexto BBVA V30.1: OK');
console.log('- módulos no catálogo sin header contextual redundante: OK');
console.log('- CTAs de Usuarios/Roles preservados: OK');
console.log('- Catálogos conservan header contextual: OK');
console.log('- identidad/contenido específico queda fuera de esta regla: OK');
