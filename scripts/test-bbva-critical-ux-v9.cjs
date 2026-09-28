const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const communicationRepository = read('api/src/lib/bbvaCertificationCommunicationRepository.ts');
const communicationService = read('api/src/lib/bbvaCertificationCommunicationService.ts');
const communicationDialog = read('src/componentsBBVATalent/CertificationCommunicationDialog.tsx');
const collaboratorsPage = read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
const contextBar = read('src/componentsBBVATalent/BBVAContextBar.tsx');
const app = read('src/App.tsx');
const trackingRepository = read('api/src/lib/bbvaCollaboratorCertificationRepository.ts');
const trackingLib = read('src/pagesBBVATalent/lib/certificationTracking.ts');
const importPage = read('src/pagesBBVATalent/collaborators/CollaboratorImportPage.tsx');

assert(communicationRepository.includes("NULLIF(LTRIM(RTRIM(p.SofttekEmail)),N'') AS recipientEmail"), 'La comunicación no usa exclusivamente el correo Softtek.');
assert(!/BbvaEmail[^\n]*AS recipientEmail/i.test(communicationRepository), 'El correo BBVA sigue siendo destinatario principal.');
assert(communicationRepository.includes('automaticCc'), 'No existe resolución automática de CC.');
assert(communicationService.includes('Resultados de ${source.certificationName}'), 'El asunto por defecto no usa "Resultados de ...".');
assert(communicationDialog.includes('correo Softtek'), 'El diálogo no identifica el correo Softtek como destinatario.');
assert(communicationDialog.includes('CC automático'), 'El diálogo no expone el CC automático.');

assert(
  collaboratorsPage.includes('item.certificationValid + item.certificationExpiring'),
  'La tabla de colaboradores no suma vigentes + próximas a vencer como cobertura.'
);
assert(collaboratorsPage.includes('Cubierta · próxima a vencer'), 'La tabla no distingue próxima a vencer como cubierta.');
assert(collaboratorsPage.includes('Mover a Banco de talento'), 'Mover a Banco de talento no está en acciones de la tabla.');

assert(contextBar.includes('<Link'), 'Los breadcrumbs no usan enlaces navegables.');
assert(contextBar.includes("aria-current={current ? 'page' : undefined}"), 'El breadcrumb actual no está marcado semánticamente.');
assert(!exists('src/pagesBBVATalent/collaborators/CollaboratorManagePage.tsx'), 'La vista Gestionar todavía existe físicamente.');
assert(!app.includes('CollaboratorManagePage'), 'App todavía carga CollaboratorManagePage.');
assert(app.includes('/bbva/collaborators/:id/manage'), 'Falta redirect de compatibilidad para la ruta legacy /manage.');

assert(trackingRepository.includes('criticalActionRequired'), 'Backend de seguimiento no expone criticalActionRequired.');
assert(trackingLib.includes('requiresCriticalExitReview'), 'Frontend no centraliza la regla crítica de 2 intentos.');
assert(trackingLib.includes('criticalExit'), 'El resumen de seguimiento no cuenta casos críticos.');

assert(importPage.includes('Aplicando importación en el servidor'), 'La importación no muestra estado pending del servidor.');
assert(importPage.includes('decisionNotice'), 'Las decisiones locales de importación no dan feedback visible.');

console.log('OK: 16 guardas de UX/integridad BBVA V9.');
