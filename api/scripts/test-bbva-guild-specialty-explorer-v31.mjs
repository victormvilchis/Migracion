import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const nav = read('src/componentsBBVATalent/bbvaNavigation.ts');
const app = read('src/App.tsx');
const explorer = read('src/pagesBBVATalent/staffing/EngineeringSpecialtyExplorerPage.tsx');
const editor = read('src/pagesBBVATalent/staffing/EngineeringSpecialtyEditorPage.tsx');
const service = read('api/src/lib/bbvaEngineeringSpecialtyService.ts');
const repository = read('api/src/lib/bbvaEngineeringSpecialtyRepository.ts');
const structureRepo = read('api/src/lib/bbvaStructureCatalogRepository.ts');
const fn = read('api/src/functions/bbvaEngineeringSpecialties.ts');
const agents = read('AGENTS.md');

// Un único módulo visible y rutas legacy seguras.
assert.doesNotMatch(nav, /id: 'bbva-structures'/);
assert.equal((nav.match(/label: 'Gremios y Especialidades'/g) ?? []).length, 1);
assert.match(nav, /Explorador visual de Estructura BBVA/);
assert.match(app, /catalogs\/structures\/\*/);
assert.match(app, /Navigate to="\/bbva\/admin\/catalogs\/engineering-specialties" replace/);
assert.match(app, /engineering-specialties\/structures\/new/);
assert.match(app, /EngineeringSpecialtyExplorerPage/);

// El módulo principal ya no es tabla/CRUD plano y no agrega importación.
assert.match(explorer, /GREMIOS Y ESPECIALIDADES/);
assert.match(explorer, /Jerarquía/);
assert.match(explorer, /Mapa de calor/);
assert.match(explorer, /Insights/);
assert.doesNotMatch(explorer, /<table/);
assert.doesNotMatch(explorer, /Importar/);
assert.match(explorer, /Nueva estructura/);
assert.match(explorer, /Nueva especialidad/);

// Exactamente los cuatro KPIs pedidos; cobertura basada en colaboradores, no staffer.
for (const label of ['Gremios', 'Especialidades', 'Cobertura de colaboradores', 'Estructura BBVA']) assert.match(explorer, new RegExp(`label="${label}"`));
assert.equal((explorer.match(/<BBVAMetricCard/g) ?? []).length, 4);
assert.doesNotMatch(explorer, /Cobertura de staffer/i);
assert.match(explorer, /colaboradores activos dentro de la jerarquía/);

// Staffer sí forma parte de la operación y Responsable ASO no se introduce.
assert.match(explorer, /TODOS LOS STAFFER/);
assert.match(explorer, /STAFFER/);
assert.doesNotMatch(explorer, /Responsable ASO/i);

// La cobertura usa colaboradores ACTIVE + par N2/N3 + gremio/especialidad activa reconocida.
assert.match(repository, /WHERE c\.Status=N'ACTIVE'/);
assert.match(service, /activePairs\.has\(pair\) && specialtyPairs\.has\(pair\)/);
assert.match(service, /coveredCollaborators\.length \/ activeCollaborators/);
assert.match(service, /activeCollaborators \? Math\.round/);
assert.match(service, /: 100/);
assert.doesNotMatch(service, /score|risk/i);

// No inferir persona -> especialidad; las personas se agregan por par N2/N3.
assert.match(service, /peopleByPair/);
assert.doesNotMatch(service, /specialty.*personId|personId.*specialty/i);

// Catálogo-first: especialidad selecciona N2/N3 y backend valida el par activo.
assert.match(editor, /useStructureCatalog/);
assert.match(editor, /Estructura nivel 2/);
assert.match(editor, /Gremio \/ nivel 3/);
assert.match(editor, /BBVASearchableSelect/);
assert.match(repository, /structurePairExists/);
assert.match(service, /validateHierarchy/);
assert.match(service, /debe pertenecer a la estructura nivel 2 seleccionada/);

// Integridad al renombrar/eliminar estructura.
assert.match(structureRepo, /UPDATE bbva\.EngineeringSpecialtyCatalog SET N3=@newName/);
assert.match(structureRepo, /UPDATE bbva\.EngineeringSpecialtyCatalog SET Guild=@newGuild,N3=COALESCE\(@newParent,N3\)/);
assert.match(structureRepo, /La estructura tiene especialidades asociadas y no puede eliminarse/);

// Endpoint combinado conserva controles de acceso de catálogo y colaboradores.
assert.match(fn, /bbvaEngineeringSpecialtyExplorer/);
assert.match(fn, /CATALOG_READ/);
assert.match(fn, /COLLABORATOR_READ/);

// Contrato V31 persistente para futuros cambios.
assert.match(agents, /V31 — Gremios y Especialidades como explorador organizacional/);
assert.match(agents, /no usa tabla/);
assert.match(agents, /Cobertura de colaboradores/);
assert.match(agents, /no inferir que pertenece a una especialidad concreta/);
assert.match(agents, /eb03d2fe1f1fb19bb4b9fad041eaad540ab0c499/);

console.log('Gremios y Especialidades Visual Explorer V31: OK');
console.log('- navegación fusionada y rutas legacy: OK');
console.log('- explorer sin tabla con Jerarquía / Mapa de calor / Insights: OK');
console.log('- 4 KPIs esenciales con cobertura de colaboradores: OK');
console.log('- Staffer operativo, sin Responsable ASO: OK');
console.log('- relación N2/N3 validada y renombres transaccionales: OK');
console.log('- sin inferir asignación persona-especialidad inexistente: OK');
