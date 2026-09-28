import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const [pagination, alert, tracking, collaboratorForm, dashboard, importPage, importService, importDomain, certService, migration, friendlyErrors] = await Promise.all([
  read('src/componentsBBVATalent/BBVAPagination.tsx'),
  read('src/componentsBBVATalent/BBVAAlert.tsx'),
  read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx'),
  read('src/componentsBBVATalent/CollaboratorForm.tsx'),
  read('src/pagesBBVATalent/dashboard/BBVADashboardPage.tsx'),
  read('src/pagesBBVATalent/collaborators/CollaboratorImportPage.tsx'),
  read('api/src/lib/bbvaCollaboratorImportService.ts'),
  read('api/src/lib/bbvaCollaboratorImportCertificationDomain.ts'),
  read('api/src/lib/bbvaCertificationCatalogService.ts'),
  read('api/scripts/migrate-bbva-ux-standards-v15.sql'),
  read('api/src/lib/bbvaFriendlyErrors.ts'),
]);

assert(!pagination.includes("'…'") && !pagination.includes('>…<') && !pagination.includes('...pages'), 'La paginación no debe usar páginas ocultas con puntos suspensivos.');
assert(pagination.includes('pagesToRender') && pagination.includes('visibleCount'), 'La paginación debe renderizar una ventana continua de páginas concretas.');
assert(alert.includes('createPortal') && alert.includes('z-[4000]'), 'Las alertas deben renderizarse por portal por encima de modales.');
assert(tracking.includes('variant="table"') && !tracking.includes('>Postal</BBVAButton>') && tracking.includes('Aprobar') && tracking.includes('Recertificar') && tracking.includes('quarterCode'), 'Seguimiento debe usar acciones de tabla estandarizadas, Q operativo y no exponer Postal como acción rápida.');
assert(collaboratorForm.includes('Gestión') && collaboratorForm.includes('ISLookupField') && collaboratorForm.indexOf('ISLookupField') < collaboratorForm.lastIndexOf('Delivery Manager'), 'El formulario de colaborador debe priorizar IS y agrupar fechas/DM en Gestión.');
assert(!dashboard.includes('Buscar por nombre') && !dashboard.includes('Todos los DM'), 'El panel operativo no debe usar búsqueda libre ni filtro por DM.');
assert(importPage.includes('Quitar archivo') && importPage.includes('Cambiar archivo') && importPage.includes('Solución:'), 'Importación debe permitir reemplazar/quitar archivo y siempre mostrar solución.');
assert(importPage.includes('groupedPreviewErrors'), 'Los errores repetidos de importación deben agruparse.');
assert(importService.includes('CATALOG_INACTIVE_SKIPPED') && /selected\.inactive\s*\?\s*false/.test(importService), 'Una certificación inactiva no debe generar cientos de errores bloqueantes durante importación.');
assert(importDomain.includes('applicable !== false && attempt.value !== null'), 'No aplica no debe generar ATTEMPT_WITHOUT_EVIDENCE por un intento residual.');
assert(certService.includes("status === 'ACTIVE'") && certService.includes('synchronizeAllActive'), 'La sincronización masiva del catálogo de certificaciones debe reservarse para activación.');
assert(migration.includes("N'Internalización'") && migration.includes("N'Reprobó examen tecnológico'") && migration.includes("N'Reprobó examen de Normativa'"), 'V15 debe reparar acentos mexicanos por código estable.');
assert(friendlyErrors.includes('correo Softtek') && friendlyErrors.includes('correo BBVA') && friendlyErrors.includes('IS') && friendlyErrors.includes('usuario BBVA / XM'), 'Los duplicados deben identificar el campo exacto al usuario.');

console.log('OK: estándares UX BBVA V15 verificados.');
