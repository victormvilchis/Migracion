import type { BBVADataHelpContent } from '../../componentsBBVATalent/BBVADataHelp';

export type DashboardMetricKey =
  | 'collaboratorsActive'
  | 'talentBankActive'
  | 'certificationsApplicable'
  | 'coveragePercent'
  | 'attentionRequired'
  | 'technologiesRepresented'
  | 'dataQualityPending'
  | 'expiring'
  | 'expired'
  | 'recertificationPending'
  | 'pending'
  | 'certificationAverage';

export const dashboardMetricDefinitions: Record<DashboardMetricKey, BBVADataHelpContent> = {
  collaboratorsActive: {
    what: 'Colaboradores con estado activo dentro del universo definido por los filtros actuales.',
    calculation: 'Conteo de colaboradores activos que cumplen los filtros seleccionados.',
    interpretation: 'Representa el tamaño actual del universo de colaboradores que estás consultando.',
  },
  talentBankActive: {
    what: 'Personas con una entrada activa en Banco de talento dentro de los filtros actuales.',
    calculation: 'Conteo de entradas activas de Banco de talento que cumplen el contexto seleccionado.',
    interpretation: 'Permite dimensionar la población disponible en Banco de talento para el contexto actual.',
  },
  certificationsApplicable: {
    what: 'Certificaciones marcadas como aplicables para los colaboradores del universo actual.',
    calculation: 'Conteo de certificaciones aplicables, excluyendo las marcadas como No aplica.',
    interpretation: 'Es el universo sobre el que se calculan la cobertura y los estados de certificación.',
  },
  coveragePercent: {
    what: 'Proporción de certificaciones aplicables que actualmente están vigentes o próximas a vencer.',
    calculation: '(Vigentes + próximas a vencer) / certificaciones aplicables × 100.',
    interpretation: 'Una cobertura menor implica que una mayor parte de los requisitos está pendiente, vencida o en recertificación.',
  },
  attentionRequired: {
    what: 'Colaboradores con al menos una certificación vencida, próxima a vencer, pendiente o pendiente de recertificación.',
    calculation: 'Conteo de personas del universo actual cuya suma de esos estados es mayor que cero.',
    interpretation: 'Identifica personas que tienen al menos un elemento operativo por revisar; no representa un score de riesgo.',
  },
  technologiesRepresented: {
    what: 'Cantidad de tecnologías distintas presentes entre los colaboradores filtrados.',
    calculation: 'Conteo de tecnologías con al menos un colaborador, excluyendo el valor Sin tecnología.',
    interpretation: 'Muestra la diversidad tecnológica del universo consultado.',
  },
  dataQualityPending: {
    what: 'Colaboradores activos con al menos un dato requerido para seguimiento todavía sin completar.',
    calculation: 'Cuenta personas con IS, usuario BBVA, correo Softtek, correo BBVA, Delivery Manager o fecha de inicio faltante.',
    interpretation: 'Ayuda a dimensionar la información operativa que aún requiere completarse.',
  },
  expiring: {
    what: 'Certificaciones aplicables que se encuentran dentro de su ventana configurada de próximo vencimiento.',
    calculation: 'Conteo de certificaciones cuyo estado calculado actual es Próxima a vencer.',
    interpretation: 'Son certificaciones todavía cubiertas, pero requieren seguimiento preventivo antes de su vencimiento.',
  },
  expired: {
    what: 'Certificaciones aplicables cuya vigencia ya terminó y no están clasificadas como recertificación pendiente.',
    calculation: 'Conteo de certificaciones cuyo estado calculado actual es Vencida.',
    interpretation: 'Representan requisitos que ya no se encuentran cubiertos por una certificación vigente.',
  },
  recertificationPending: {
    what: 'Certificaciones vencidas cuya configuración habilita un proceso de recertificación.',
    calculation: 'Conteo de certificaciones cuyo estado calculado actual es Recertificación pendiente.',
    interpretation: 'Identifica certificaciones vencidas que deben continuar por el flujo configurado de recertificación.',
  },
  certificationAverage: {
    what: 'Calificación promedio actual de las certificaciones configuradas para manejar promedio.',
    calculation: 'Usa una sola calificación válida por persona y certificación: la evidencia válida más reciente. Excluye Sin examen, No aplica y registros sin calificación.',
    interpretation: 'Mide desempeño actual sin dar mayor peso a una persona por acumular más intentos.',
  },
  pending: {
    what: 'Certificaciones aplicables que todavía no están cubiertas y requieren seguimiento.',
    calculation: 'Conteo de estados pendientes y reprobados dentro del universo actual.',
    interpretation: 'Representa certificaciones que todavía no aportan cobertura vigente.',
  },
};
