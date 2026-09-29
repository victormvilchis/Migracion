import type { BBVADataHelpContent } from './BBVADataHelp';

function normalized(label: string): string {
  return label.toLocaleLowerCase('es-MX').replace(/\s+/g, ' ').trim();
}

export function defaultMetricHelp(label: string, supportingText?: string, trendText?: string): BBVADataHelpContent {
  const key = normalized(label);
  const scope = 'El valor responde al universo y a los filtros activos del módulo. Al cambiar tecnología, estructura, periodo, estado u otro filtro disponible, este indicador se recalcula con el nuevo contexto.';

  if (key.includes('críticos 2/2')) return {
    what: 'Casos de certificación que agotaron el máximo de 2 intentos y todavía requieren una resolución operativa.',
    calculation: 'Cuenta registros con regla crítica 2/2 activa y resolución pendiente. No suma casos ya resueltos como baja confirmada o becario.',
    interpretation: 'Un valor mayor que cero requiere atención prioritaria porque el colaborador ya no dispone de intentos en el ciclo actual.',
    scope,
  };
  if (key.includes('banco de talento')) return {
    what: 'Personas con una entrada activa en Banco de talento dentro del contexto actual.',
    calculation: 'Cuenta únicamente entradas activas. La permanencia y la urgencia por más de 60 días se calculan por separado.',
    interpretation: 'Sirve para dimensionar la población disponible y detectar si el banco está creciendo o requiere asignaciones.',
    scope,
  };
  if (key.includes('cobertura de colaboradores')) return {
    what: 'Porcentaje de colaboradores activos cuya estructura organizacional está correctamente ubicada dentro de la jerarquía configurada.',
    calculation: 'Colaboradores activos con Nivel 2 y Nivel 3 válidos / total de colaboradores activos del contexto × 100.',
    interpretation: 'Una cobertura menor al 100% señala personas con estructura faltante, histórica o fuera del catálogo vigente.',
    scope,
  };
  if (key.includes('cobertura')) return {
    what: 'Proporción de requisitos de certificación que actualmente están cubiertos para el universo consultado.',
    calculation: 'Certificaciones vigentes y próximas a vencer / certificaciones aplicables × 100. Las no aplicables no forman parte del denominador.',
    interpretation: 'Mientras más alto sea el porcentaje, mayor es la cobertura vigente. Los pendientes, vencidos y procesos de recertificación reducen el resultado.',
    scope,
  };
  if (key.startsWith('vencen en') || key.includes('personas con vencimiento')) return {
    what: 'Vencimientos de certificación cuya fecha cae dentro del periodo seleccionado.',
    calculation: 'Se consideran las fechas efectivas de vencimiento dentro de los límites del periodo activo. En la métrica de personas, cada colaborador se cuenta una sola vez aunque tenga varias certificaciones.',
    interpretation: 'Permite anticipar la carga de renovación del periodo y priorizar seguimiento antes de que la cobertura se pierda.',
    scope,
  };
  if (key.includes('próximas a vencer')) return {
    what: 'Certificaciones todavía vigentes que ya entraron en su ventana de alerta previa al vencimiento.',
    calculation: 'Cuenta registros cuyo estado calculado es Próxima a vencer según la vigencia y la regla de alerta configurada.',
    interpretation: 'No están vencidas todavía, pero requieren seguimiento preventivo para evitar una pérdida futura de cobertura.',
    scope,
  };
  if (key.includes('vencidas')) return {
    what: 'Certificaciones aplicables cuya vigencia terminó y ya no cubren el requisito actual.',
    calculation: 'Cuenta registros con fecha de expiración anterior al corte operativo y estado calculado Vencida.',
    interpretation: 'Representan faltantes de cobertura que deben revisarse o llevarse a recertificación cuando la certificación lo permita.',
    scope,
  };
  if (key.includes('recertificación')) return {
    what: 'Certificaciones cuyo ciclo vigente terminó y requieren iniciar o completar un nuevo ciclo de certificación.',
    calculation: 'Cuenta registros clasificados por la regla de negocio como Recertificación pendiente.',
    interpretation: 'Identifica renovaciones que ya no deben tratarse como un pendiente inicial, sino como continuidad de una certificación previa.',
    scope,
  };
  if (key.includes('reprobadas')) return {
    what: 'Certificaciones con al menos un intento reprobado en el ciclo actual y que todavía requieren seguimiento.',
    calculation: 'Cuenta el estado actual derivado de los intentos registrados; el máximo permitido se toma de la configuración de la certificación.',
    interpretation: 'Ayuda a distinguir casos que ya presentaron y reprobaron de aquellos que todavía no han presentado.',
    scope,
  };
  if (key.includes('pendientes')) return {
    what: 'Requisitos de certificación aplicables que todavía no cuentan con cobertura vigente.',
    calculation: 'Incluye los registros pendientes según las reglas de aplicabilidad y ciclo. Las certificaciones marcadas como No aplica quedan fuera.',
    interpretation: 'Es el volumen de trabajo todavía abierto para alcanzar la cobertura esperada del universo actual.',
    scope,
  };
  if (key.includes('atención requerida')) return {
    what: 'Volumen de casos de certificación que requieren una acción operativa dentro del contexto actual.',
    calculation: 'Agrupa pendientes, vencidas, reprobadas, próximas a vencer, recertificaciones y casos críticos según las reglas vigentes del módulo.',
    interpretation: 'Úsalo como puerta de entrada al seguimiento. No es un score de riesgo: representa trabajo pendiente o preventivo.',
    scope,
  };
  if (key.includes('promedio certificaciones')) return {
    what: 'Calificación promedio actual de las certificaciones configuradas para manejar score.',
    calculation: 'Usa la evidencia válida más reciente por persona y certificación. Excluye registros sin calificación y certificaciones que no manejan score.',
    interpretation: 'Permite observar desempeño sin dar mayor peso a una persona por acumular más intentos.',
    scope,
  };
  if (key.includes('colaboradores activos')) return {
    what: 'Cantidad de colaboradores activos dentro del universo definido por los filtros actuales.',
    calculation: 'Conteo de personas con estado activo que cumplen todos los filtros seleccionados.',
    interpretation: 'Representa el tamaño real de la población sobre la que se calculan el resto de métricas del contexto.',
    scope,
  };
  if (key.includes('gremios')) return {
    what: 'Cantidad de gremios o estructuras Nivel 3 visibles dentro del contexto de Gremios y Especialidades.',
    calculation: 'Cuenta los nodos Nivel 3 activos que permanecen después de aplicar los filtros del explorador.',
    interpretation: 'Permite dimensionar cuántos gremios participan en la estructura seleccionada y comparar su distribución.',
    scope,
  };
  if (key.includes('especialidades')) return {
    what: 'Cantidad de especialidades configuradas dentro de los gremios visibles en el contexto actual.',
    calculation: 'Cuenta especialidades activas asociadas a los gremios resultantes de los filtros.',
    interpretation: 'Sirve para medir la amplitud de especialización disponible y detectar gremios con poca o ninguna configuración.',
    scope,
  };
  if (key.includes('estructura bbva')) return {
    what: 'Resumen del tamaño de la jerarquía BBVA utilizada por el explorador.',
    calculation: 'Muestra la cantidad de nodos Nivel 2 y Nivel 3 visibles en el contexto actual.',
    interpretation: 'Ayuda a entender la profundidad y cobertura estructural antes de analizar personas, gremios o especialidades.',
    scope,
  };
  if (key.includes('datos por completar')) return {
    what: 'Colaboradores activos que todavía tienen información operativa requerida sin completar.',
    calculation: 'Cuenta personas con uno o más campos operativos pendientes según las reglas de calidad de datos del sistema.',
    interpretation: 'Permite priorizar saneamiento de información antes de usar los datos para seguimiento o reportes.',
    scope,
  };
  if (key.includes('preparación vendors')) return {
    what: 'Nivel de preparación del universo para el corte Vendors del periodo seleccionado.',
    calculation: 'Se deriva de las certificaciones aplicables y su cobertura vigente conforme a las reglas del periodo.',
    interpretation: 'Un porcentaje menor indica que todavía existen requisitos que deben cubrirse antes del corte operativo.',
    scope,
  };

  return {
    what: `Indicador operativo “${label}” calculado con la información real disponible en este módulo.`,
    calculation: supportingText ? `Se construye con las reglas de negocio del módulo. Contexto visible: ${supportingText}.` : 'Se construye a partir de los registros que cumplen el contexto y los filtros activos del módulo.',
    interpretation: trendText ? `El valor actual puede compararse con la referencia mostrada: ${trendText}. Úsalo junto con el detalle del módulo para entender la causa.` : 'Úsalo como resumen del contexto actual y abre el detalle cuando necesites identificar los registros que explican el valor.',
    scope,
  };
}
