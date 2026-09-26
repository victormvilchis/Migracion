# Configuración inicial de certificaciones BBVA

La ingesta inicial del catálogo se construye a partir del manual informativo de cursos y certificaciones entregado para el módulo.

## Reglas precargadas

- Certificaciones tecnológicas: recertificación cada 24 meses.
- Certificación metodológica: certificación única, sin vencimiento automático.
- Desarrollo Seguro: recertificación cada 12 meses.
- Certificaciones tecnológicas, metodológicas y Desarrollo Seguro se marcan obligatorias por defecto; la aplicabilidad final se resuelve por perfil mediante `bbva.CertificationProfileRule`.
- La matriz de seniority se persiste en `bbva.CertificationAllowedLevel` y se utiliza para precargar perfiles aplicables.
- Los costos de intento y certificadoras se precargan donde el manual los especifica.
- `InitialCompletionMonths` y `ExpiringSoonDays` quedan configurables y sin un valor inventado cuando la fuente no establece un plazo explícito.

## Integridad

- Las tecnologías, perfiles y perfiles tecnológicos se resuelven desde los catálogos activos.
- Talent Bank y Colaboradores persisten referencias por ID de catálogo y conservan el texto como snapshot histórico.
- No se permite crear o editar una certificación tecnológica con una tecnología inexistente o inactiva.
- No se permite guardar reglas de perfiles inexistentes o inactivos.
- La eliminación física de una certificación se bloquea cuando existe historial operativo; en ese caso debe inactivarse.
- Código y nombre de certificación son únicos.

## Nota de fuente

El manual contiene una diferencia entre la lista agrupada de exámenes y la matriz detallada de seniority/certificadora. Para la ingesta de `Provider` y `AllowedLevel` se toma como referencia la matriz detallada de seniority, porque relaciona explícitamente cada examen con certificadora y nivel. Desarrollo Seguro se configura con NETEC, consistente también con la sección específica de Desarrollo Seguro.
