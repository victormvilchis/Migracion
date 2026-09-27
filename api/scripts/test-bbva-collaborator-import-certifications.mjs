import assert from 'node:assert/strict';
import {
  addCalendarDays,
  addCalendarMonths,
  importCertificationAttemptFingerprint,
  importCertificationResolutionKey,
  parseCertificationEvidence,
} from '../dist/lib/bbvaCollaboratorImportCertificationDomain.js';

const config = (overrides = {}) => ({
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Test',
  certificationType: 'COMPLIANCE',
  technologyName: null,
  validityMonths: null,
  initialCompletionDays: null,
  expiringSoonDays: null,
  recertificationEnabled: false,
  requiresAttempts: false,
  requiresApplicationDate: false,
  ...overrides,
});
const source = (values, rowNumber = 2) => ({ rowNumber, values });
const parse = (block, values, options = {}) => parseCertificationEvidence({
  source: source(values),
  block,
  startDate: options.startDate ?? '2026-01-31',
  config: options.config ?? null,
  hadPreviousApproval: options.hadPreviousApproval ?? false,
  todayIso: options.todayIso ?? '2026-09-26',
});
const issueCodes = (evidence) => new Set((evidence?.issues ?? []).map((issue) => issue.code));

// A. APROBADO + fecha + intento 0: la evidencia es válida y NO equivale a un intento formal #0.
{
  const evidence = parse('DEVELOPMENT_SECURITY', {
    '¿APLICA DS?': 'SI',
    'ESTATUS CERTIFICACIÓN DS': 'VIGENTE - REGULAR',
    'ESTATUS DEL EXAMEN DS': 'APROBADO',
    'FECHA DE APLICACIÓN DS': '07/09/2026',
    'PROMEDIO DS': '9.13',
    'INTENTO DS': '0',
  }, { config: config({ validityMonths: 12, initialCompletionDays: 90, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true }) });
  assert.equal(evidence.baseStatus, 'APPROVED');
  assert.equal(evidence.applicationDate, '2026-09-07');
  assert.equal(evidence.score10, 9.13);
  assert.equal(evidence.administrativeAttempt, 0);
  assert.equal(evidence.expirationDate, '2027-09-07');
  assert.equal(issueCodes(evidence).has('FAILED_WITH_ATTEMPT_ZERO'), false);
  assert.equal(evidence.lifecycle, 'INITIAL');
}

// B. REPROBADO + intento 0: inconsistencia bloqueante.
{
  const evidence = parse('DEVELOPMENT_SECURITY', {
    '¿APLICA DS?': 'SI',
    'ESTATUS DEL EXAMEN DS': 'REPROBADO',
    'FECHA DE APLICACIÓN DS': '07/09/2026',
    'INTENTO DS': '0',
  }, { config: config({ validityMonths: 12, initialCompletionDays: 90, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true }) });
  assert.equal(evidence.baseStatus, 'FAILED');
  assert.equal(issueCodes(evidence).has('FAILED_WITH_ATTEMPT_ZERO'), true);
}

// C. Tecnológica NO APLICA + intento informado: no se debe normalizar silenciosamente.
{
  const evidence = parse('TECHNOLOGICAL', {
    '¿APLICA TECNOLOGICA?': 'NO',
    'ESTATUS CERTIFICACIÓN': 'NO APLICA',
    'INTENTO': '1',
  }, { config: config({ validityMonths: 24, initialCompletionDays: 30, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true }) });
  assert.equal(evidence.baseStatus, 'NOT_APPLICABLE');
  assert.equal(issueCodes(evidence).has('NOT_APPLICABLE_WITH_EVIDENCE'), true);
}

// D. ONE NO + Aprobado: contradicción real del tablero.
{
  const evidence = parse('ONE', { '¿APLICA ONE?': 'NO', 'ESTATUS CERTIFICACIÓN ONE': 'Aprobado' });
  assert.equal(evidence.baseStatus, 'NOT_APPLICABLE');
  assert.equal(issueCodes(evidence).has('NOT_APPLICABLE_WITH_STATUS'), true);
}

// E. ONE SI + estado vacío: no inventar aprobación.
{
  const evidence = parse('ONE', { '¿APLICA ONE?': 'SI', 'ESTATUS CERTIFICACIÓN ONE': '' });
  assert.equal(evidence.baseStatus, 'PENDING');
  assert.equal(evidence.calculatedStatus, 'PENDING');
  assert.equal(issueCodes(evidence).has('APPLICABLE_WITHOUT_STATUS'), true);
}

// F. Normativa: estado real SIN PRESENTAR - FUERA DE NORMA + REPROBADO + 5.68 + intento 1.
{
  const evidence = parse('NORMATIVE_TESTING', {
    '¿APLICA NORMATIVA?': 'SI',
    'ESTATUS CERTIFICACIÓN NORMATIVA': 'SIN PRESENTAR - FUERA DE NORMA',
    'ESTATUS DEL EXAMEN NORMATIVA': 'REPROBADO',
    'FECHA DE APLICACIÓN NORMATIVA': '07/09/2026',
    'PROMEDIO NORMATIVA': '5.68',
    'INTENTO NORMATIVA': '1',
  }, { config: config({ validityMonths: 12, initialCompletionDays: 60, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true }) });
  assert.equal(evidence.baseStatus, 'FAILED');
  assert.equal(evidence.score10, 5.68);
  assert.equal(evidence.administrativeAttempt, 1);
  assert.equal(evidence.issues.filter((issue) => issue.blocking).length, 0);
}

// G. AGILE reconoce NO AGILE como no aplicable.
{
  const evidence = parse('AGILE', { '¿APLICA AGILE?': 'NO AGILE', 'ESTATUS CERTIFICACIÓN AGILE': '' });
  assert.equal(evidence.applicable, false);
  assert.equal(evidence.baseStatus, 'NOT_APPLICABLE');
  assert.equal(evidence.lifecycle, 'NOT_APPLICABLE');
}

// H. JIRA PENDIENTE DE FORMACIÓN es estado válido sin vigencia/intentado inventados.
{
  const evidence = parse('JIRA', { 'APLICA JIRA': 'SI', 'ESTATUS DE VALORACIÓN JIRA': 'PENDIENTE DE FORMACIÓN' });
  assert.equal(evidence.baseStatus, 'PENDING');
  assert.equal(evidence.expirationDate, null);
  assert.equal(evidence.administrativeAttempt, null);
}

// I. Tecnológica: inicial = alta + 30 días; recertificación = aprobación + 24 meses.
{
  const initial = parse('TECHNOLOGICAL', {
    '¿APLICA TECNOLOGICA?': 'SI', 'ESTATUS CERTIFICACIÓN': 'SIN PRESENTAR - PROXIMO A VENCER',
  }, { startDate: '2026-01-31', config: config({ validityMonths: 24, initialCompletionDays: 30, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true }) });
  assert.equal(initial.initialDueDate, '2026-03-02');
  assert.equal(initial.lifecycle, 'INITIAL');

  const recert = parse('TECHNOLOGICAL', {
    '¿APLICA TECNOLOGICA?': 'SI', 'ESTATUS CERTIFICACIÓN': 'VIGENTE - REGULAR', 'ESTATUS DEL EXAMEN': 'APROBADO', 'FECHA DE APLICACIÓN TEC': '30/09/2026', 'INTENTO': '0',
  }, { hadPreviousApproval: true, startDate: '2020-01-01', config: config({ validityMonths: 24, initialCompletionDays: 30, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true }) });
  assert.equal(recert.lifecycle, 'RECERTIFICATION');
  assert.equal(recert.initialDueDate, null);
  assert.equal(recert.expirationDate, '2028-09-30');
}

// J. DS: inicial = alta + 90 días.
{
  const evidence = parse('DEVELOPMENT_SECURITY', { '¿APLICA DS?': 'SI', 'ESTATUS CERTIFICACIÓN DS': 'SIN PRESENTAR - PROXIMO A VENCER' }, {
    startDate: '2026-01-31', config: config({ validityMonths: 12, initialCompletionDays: 90, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true }),
  });
  assert.equal(evidence.initialDueDate, '2026-05-01');
}

// K. Normativa: LIMITE PARA NORMATIVA tiene prioridad sobre alta + 60 días.
{
  const evidence = parse('NORMATIVE_TESTING', {
    'LIMITE PARA NORMATIVA': '15/10/2026', '¿APLICA NORMATIVA?': 'SI', 'ESTATUS CERTIFICACIÓN NORMATIVA': 'SIN PRESENTAR - PROXIMO A VENCER',
  }, { startDate: '2026-01-01', config: config({ validityMonths: 12, initialCompletionDays: 60, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true }) });
  assert.equal(evidence.initialDueDate, '2026-10-15');
}

// L. Sin ExpiringSoonDays NO se inventa umbral de próximo a vencer.
{
  const evidence = parse('DEVELOPMENT_SECURITY', {
    '¿APLICA DS?': 'SI', 'ESTATUS CERTIFICACIÓN DS': 'VIGENTE - PROXIMO A VENCER', 'ESTATUS DEL EXAMEN DS': 'APROBADO', 'FECHA DE APLICACIÓN DS': '30/09/2025', 'INTENTO DS': '0',
  }, { config: config({ validityMonths: 12, initialCompletionDays: 90, recertificationEnabled: true, requiresAttempts: true, requiresApplicationDate: true, expiringSoonDays: null }), todayIso: '2026-09-01' });
  assert.equal(evidence.expirationDate, '2026-09-30');
  assert.equal(evidence.calculatedStatus, 'VALID');
}

// M. Score fuera de 0–10 es inválido.
{
  const evidence = parse('DEVELOPMENT_SECURITY', { '¿APLICA DS?': 'SI', 'PROMEDIO DS': '10.1', 'FECHA DE APLICACIÓN DS': '07/09/2026' });
  assert.equal(issueCodes(evidence).has('INVALID_SCORE'), true);
}

// N. Fingerprints/resolution keys son determinísticos para el mismo escenario.
{
  const first = parse('GITHUB', { 'APLICA GITHUB': 'SI', 'STATUS GITHUB': 'Aprobado' });
  const second = parse('GITHUB', { 'STATUS GITHUB': 'Aprobado', 'APLICA GITHUB': 'SI' });
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(
    importCertificationResolutionKey({ rowIdentity: 'persona-1', block: 'GITHUB', issueCode: 'CHANGE', sourceFingerprint: first.fingerprint, calculatedStatus: first.calculatedStatus }),
    importCertificationResolutionKey({ rowIdentity: 'persona-1', block: 'GITHUB', issueCode: 'CHANGE', sourceFingerprint: second.fingerprint, calculatedStatus: second.calculatedStatus }),
  );
  assert.equal(
    importCertificationAttemptFingerprint({ block: 'TECHNOLOGICAL', applicationDate: '2026-09-07', result: 'FAILED', score10: 7.2, administrativeAttempt: 1 }),
    importCertificationAttemptFingerprint({ block: 'TECHNOLOGICAL', applicationDate: '2026-09-07', result: 'FAILED', score10: 7.2, administrativeAttempt: 1 }),
  );
}


// O. Variaciones cosméticas de mayúsculas/acentos conservan el fingerprint funcional.
{
  const a = parse('ONE', { '¿APLICA ONE?': 'SI', 'ESTATUS CERTIFICACIÓN ONE': 'Aprobado' });
  const b = parse('ONE', { '¿APLICA ONE?': 'si', 'ESTATUS CERTIFICACIÓN ONE': 'APROBADO' });
  assert.equal(a.fingerprint, b.fingerprint);
}

// Sanidad de fechas de calendario (sin timezone drift).
assert.equal(addCalendarMonths('2024-01-31', 1), '2024-02-29');
assert.equal(addCalendarMonths('2025-01-31', 1), '2025-02-28');
assert.equal(addCalendarDays('2026-01-31', 30), '2026-03-02');

console.log('OK: 17 escenarios de dominio de importación histórica de certificaciones.');
