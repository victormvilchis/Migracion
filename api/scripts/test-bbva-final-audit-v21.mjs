import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const dashboardService = read('api/src/lib/bbvaDashboardService.ts');
const snapshotService = read('api/src/lib/bbvaDashboardSnapshotService.ts');
assert.match(dashboardService, /captureSnapshot = options\.captureSnapshot \?\? false/);
assert.match(snapshotService, /captureSnapshot: true/);

assert.equal(exists('src/componentsBBVATalent/BBVAAssistant.tsx'), false, 'BBVA Workspace no debe conservar el asistente IA fuera de alcance.');

const feedback = read('src/componentsBBVATalent/BBVAOperationFeedback.tsx');
assert.match(feedback, /useState<VisibleFeedback\[]>\(\[\]\)/);
assert.match(feedback, /timersRef = useRef\(new Map<string, number>\(\)\)/);
assert.match(feedback, /current\.filter\(\(item\) => item\.id !== next\.id\)/);
const apiClient = read('src/lib/api.ts');
assert.match(apiClient, /\['POST', 'PUT', 'PATCH', 'DELETE'\]/);
assert.match(apiClient, /Convirtiendo a colaborador/);

const movePage = read('src/pagesBBVATalent/collaborators/CollaboratorMoveToTalentPage.tsx');
assert.match(movePage, /bbvaBusinessDate\(\)/);
assert.match(movePage, /expectedUpdatedAt: item\.updatedAt/);
assert.doesNotMatch(movePage, /new Date\(\)\.getFullYear/);

const lifecycleRepo = read('api/src/lib/bbvaPersonLifecycleRepository.ts');
assert.match(lifecycleRepo, /bbva\.Collaborator WITH \(UPDLOCK,HOLDLOCK\)/);
assert.match(lifecycleRepo, /locked\.updatedAt !== input\.expectedUpdatedAt/);
assert.match(lifecycleRepo, /bbva\.TalentBankEntry WITH \(UPDLOCK,HOLDLOCK\)/);

const certificationRepo = read('api/src/lib/bbvaCollaboratorCertificationRepository.ts');
assert.match(certificationRepo, /criticalActionRequired/);
assert.match(certificationRepo, /ISNULL\(attemptStats\.attemptCount,0\) AS attemptCount/);
assert.match(certificationRepo, /ISNULL\(attemptStats\.attemptCount,0\) \+ 1 AS nextAttemptNumber/);
assert.match(certificationRepo, /CERTIFICATION_CONCURRENCY_CONFLICT/);
assert.match(certificationRepo, /PersonCertification pc WITH \(UPDLOCK,HOLDLOCK\)/);

const certificationDomain = read('api/src/lib/bbvaCollaboratorCertificationDomain.ts');
assert.match(certificationDomain, /criticalActionRequired: boolean/);
const certificationTypes = read('src/pagesBBVATalent/types/collaboratorCertification.ts');
assert.match(certificationTypes, /criticalActionRequired: boolean/);
const certificationsPage = read('src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage.tsx');
assert.doesNotMatch(certificationsPage, /CRITICAL_EXIT_TYPES/);
assert.match(certificationsPage, /item\.criticalActionRequired === true/);
const collaboratorDetail = read('src/pagesBBVATalent/collaborators/CollaboratorDetailPage.tsx');
assert.doesNotMatch(collaboratorDetail, /DEVELOPMENT_SECURITY.*TECHNOLOGICAL.*NORMATIVE_TESTING/s);
assert.match(collaboratorDetail, /item\.criticalActionRequired === true/);
const trackingLib = read('src/pagesBBVATalent/lib/certificationTracking.ts');
assert.doesNotMatch(trackingLib, /CRITICAL_EXIT_CERTIFICATION_TYPES/);
assert.match(trackingLib, /item\.criticalActionRequired === true/);

const convertPage = read('src/pagesBBVATalent/talentBank/TalentConvertPage.tsx');
assert.doesNotMatch(convertPage, /useUpdateTalent/);
assert.equal((convertPage.match(/convertMutation\.mutateAsync/g) ?? []).length, 1, 'La conversión debe ejecutarse con una sola mutación HTTP.');
assert.match(convertPage, /expectedUpdatedAt: talent\.updatedAt/);
const conversionRepo = read('api/src/lib/bbvaTalentConversionRepository.ts');
assert.match(conversionRepo, /TalentBankEntry WITH \(UPDLOCK,HOLDLOCK\)/);
assert.match(conversionRepo, /locked\.updatedAt !== input\.expectedUpdatedAt/);
assert.match(conversionRepo, /UPDATE bbva\.Person/);
const talentRepo = read('api/src/lib/bbvaTalentRepository.ts');
assert.match(talentRepo, /Stage,Active,DeletedAt FROM bbva\.TalentBankEntry WITH \(UPDLOCK,HOLDLOCK\)/);
assert.match(talentRepo, /ya fue convertido a colaborador y no puede eliminarse/);

const talentFunction = read('api/src/functions/bbvaTalentBank.ts');
assert.match(talentFunction, /talentConvertHandler[\s\S]*assertBbvaPermission\(user, 'TALENT_WRITE'\);[\s\S]*assertBbvaPermission\(user, 'COLLABORATOR_WRITE'\)/);
const collaboratorFunction = read('api/src/functions/bbvaCollaborators.ts');
assert.match(collaboratorFunction, /collaboratorMoveToTalentHandler[\s\S]*assertBbvaPermission\(user, 'COLLABORATOR_WRITE'\);[\s\S]*assertBbvaPermission\(user, 'TALENT_WRITE'\)/);

const attemptPage = read('src/pagesBBVATalent/collaboratorCertifications/CertificationAttemptPage.tsx');
assert.doesNotMatch(attemptPage, /recipientEmail\?: string; subject\?: string/);
const communicationDomain = read('api/src/lib/bbvaCertificationCommunicationDomain.ts');
assert.match(communicationDomain, /criticalResolutionStatus === 'LOW_CONFIRMED'\) return 'LOW'/);

const bbvaFrontend = [
  ...fs.readdirSync(path.join(root, 'src/pagesBBVATalent'), { recursive: true }).filter((x) => /\.(ts|tsx)$/.test(String(x))).map((x) => path.join('src/pagesBBVATalent', String(x))),
  ...fs.readdirSync(path.join(root, 'src/componentsBBVATalent'), { recursive: true }).filter((x) => /\.(ts|tsx)$/.test(String(x))).map((x) => path.join('src/componentsBBVATalent', String(x))),
];
for (const relative of bbvaFrontend) {
  const text = read(relative);
  assert.doesNotMatch(text, /\bfetch\s*\(/, `${relative} no debe saltarse el cliente API compartido.`);
  assert.doesNotMatch(text, /window\.(alert|confirm)\s*\(/, `${relative} no debe usar alert/confirm nativos.`);
}

console.log('Auditoría transversal BBVA V21: OK');
console.log('- Dashboard GET sin efectos laterales: OK');
console.log('- feedback concurrente de mutaciones: OK');
console.log('- reglas críticas 2/2 centralizadas en backend: OK');
console.log('- conversiones de ciclo de vida con concurrencia/atomicidad: OK');
console.log('- recertificación y cambios críticos protegidos: OK');
console.log('- comunicación LOW y correo Softtek preservados: OK');
console.log('- BBVA Workspace sin UI de IA fuera de alcance: OK');
