import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const deletedFiles = [
  'src/componentsBBVATalent/BBVAQuarterSelector.tsx',
  'src/pagesBBVATalent/lib/dashboardInsights.ts',
];
for (const relative of deletedFiles) assert.equal(exists(relative), false, `Archivo huérfano todavía presente: ${relative}`);

const frontendFiles = [
  'src/pagesBBVATalent/hooks/useLifecycle.ts',
  'src/pagesBBVATalent/api/lifecycleApi.ts',
  'src/pagesBBVATalent/hooks/useTalent.ts',
  'src/pagesBBVATalent/api/talentApi.ts',
  'src/pagesBBVATalent/hooks/useAdminUsers.ts',
  'src/pagesBBVATalent/api/adminUserApi.ts',
  'src/pagesBBVATalent/hooks/useStructureCatalog.ts',
  'src/pagesBBVATalent/api/structureCatalogApi.ts',
  'src/pagesBBVATalent/types/talent.ts',
  'src/pagesBBVATalent/lib/bbvaDisplayFormat.ts',
  'src/pagesBBVATalent/lib/certificationTracking.ts',
  'src/componentsBBVATalent/BBVAInsightCard.tsx',
];
const frontend = frontendFiles.map(read).join('\n');
for (const symbol of [
  'useCollaboratorLifecycle',
  'useTalentHistory',
  'useUpdateTalentStage',
  'useReassignAdminUserDeliveryManager',
  'useDeleteStructure',
  'ACADEMY_PROFILES',
  'sentenceCaseList',
  'buildTrackingInsights',
  'buildDashboardInsights',
  'buildDashboardOperationalPriorities',
  'TalentHistoryItem',
]) {
  assert.equal(frontend.includes(symbol), false, `Símbolo muerto todavía presente: ${symbol}`);
}

const postcardFont = read('api/src/lib/bbvaPostcardFont.ts');
assert.doesNotMatch(postcardFont, /POSTCARD_FONT_ROWS/);

const insightCard = read('src/componentsBBVATalent/BBVAInsightCard.tsx');
assert.match(insightCard, /export type DashboardInsightTone = 'rose' \| 'orange' \| 'amber' \| 'blue' \| 'emerald' \| 'slate'/);
assert.doesNotMatch(insightCard, /dashboardInsights/);

const tracking = read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const v24 = read('api/scripts/test-bbva-quarter-business-v24.mjs');
assert.match(tracking, /ariaLabel="Periodo de vencimiento"/);
assert.match(tracking, /searchPlaceholder="Buscar periodo"/);
assert.doesNotMatch(tracking, /BBVAQuarterSelector/);
assert.doesNotMatch(v24, /read\('src\/componentsBBVATalent\/BBVAQuarterSelector\.tsx'\)/);

// La limpieza es exclusivamente frontend/interna: los contratos backend siguen disponibles.
const collaboratorFn = read('api/src/functions/bbvaCollaborators.ts');
const talentFn = read('api/src/functions/bbvaTalentBank.ts');
const adminFn = read('api/src/functions/bbvaUserAdmin.ts');
const structureFn = read('api/src/functions/bbvaStructures.ts');
assert.match(collaboratorFn, /route: 'bbva\/collaborators\/\{id\}\/lifecycle'/);
assert.match(talentFn, /route: 'bbva\/talent-bank\/\{id\}\/stage'/);
assert.match(talentFn, /route: 'bbva\/talent-bank\/\{id\}\/history'/);
assert.match(adminFn, /route:'bbva\/admin\/users\/\{id\}\/reassign-delivery-manager'/);
assert.match(structureFn, /methods:\['GET','PUT','DELETE'\].*route:'bbva\/structures\/\{id\}'/s);

console.log('Limpieza interna BBVA V27B: OK');
console.log('- hooks/helpers/exports sin consumidores eliminados: OK');
console.log('- BBVAQuarterSelector huérfano eliminado sin tocar el filtro Periodo activo: OK');
console.log('- dashboardInsights local huérfano eliminado; recomendaciones backend preservadas: OK');
console.log('- contratos backend preservados: OK');
