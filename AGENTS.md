# BFS — Agent Engineering Contract

## 1. Purpose

This repository contains BFS, the target platform currently under active development.

AI coding agents may assist with analysis, implementation, refactoring, testing and migration work, but they MUST follow this document before modifying the repository.

This file is the primary engineering contract for agent-assisted development.

---

## 2. Repository boundaries

The development workspace may contain multiple repositories.

### TARGET — READ AND WRITE

`BaseBFS/`

This is the ONLY target repository for BFS migration and development tasks.

Agents MAY:
- inspect files
- create files
- modify files
- execute builds
- execute tests
- run local development commands

All requested implementation work must occur here unless the user explicitly says otherwise.

### REFERENCE — READ ONLY

`../nexoskill-evaluation-platform/`

This repository is an existing platform that may be inspected to understand:

- business rules
- validation rules
- security behavior
- authorization behavior
- data integrity constraints
- workflows
- domain relationships
- pagination behavior
- import/export behavior
- auditing behavior
- UI behavior when relevant

It is a REFERENCE implementation.

NEVER modify this repository during BFS migration work.

Do not create, delete, rename or format files in it.

Do not run migrations or destructive commands against it.

### OUT OF SCOPE

`../nexoskill-evaluation-platform-marketing/`

This repository belongs to a different product.

Do NOT inspect, modify, copy or use it as a migration source unless the user explicitly requests it.

---

## 3. Migration principle

BFS is NOT a blind copy of the reference platform.

For every migrated capability:

1. Inspect the current BFS implementation.
2. Inspect the relevant reference implementation when necessary.
3. Identify actual business behavior.
4. Identify validation rules.
5. Identify authorization and security rules.
6. Identify data-integrity constraints.
7. Identify relevant edge cases.
8. Determine what applies to the BFS domain.
9. Implement it using BFS architecture and terminology.
10. Verify behavioral compatibility where required.
11. Improve implementation quality where possible without changing required business behavior.
12. Run all applicable quality gates.

Never copy a module mechanically without understanding its behavior.

---

## 4. No source-product leakage

The reference platform's product/project name is internal migration context.

It MUST NOT appear in BFS:

- UI text
- API responses
- database descriptions
- database seed descriptions
- comments
- source-code identifiers
- documentation intended for BFS
- commit messages
- error messages
- configuration descriptions

Use BFS terminology.

Reference-project paths may only appear in agent-specific development instructions when technically necessary.

---

## 5. Preserve critical behavior

When migrating applicable capabilities, preserve or deliberately replace with an equivalent BFS mechanism:

- business rules
- validation
- authorization
- security controls
- data integrity
- referential integrity
- lifecycle states
- auditability
- idempotency where applicable
- conflict handling
- error semantics
- pagination behavior
- filtering behavior
- sorting behavior
- concurrency-sensitive behavior where applicable

Do not silently remove a rule because implementing it is inconvenient.

If a reference rule appears incompatible with BFS, STOP and explain the conflict before changing the expected behavior.

---

## 6. Security is server-side

Frontend restrictions are NOT authorization.

Sensitive operations must be protected in the API/backend.

Never rely exclusively on:

- hidden buttons
- disabled controls
- route visibility
- frontend role checks

to enforce authorization.

Validate permissions server-side.

Never weaken an existing security control without explicit approval.

---

## 7. Catalog-first architecture

Values that belong to an administrable business catalog MUST NOT be duplicated or hardcoded throughout the frontend.

Preferred flow:

Frontend
→ API
→ Catalog service/domain
→ Repository
→ Database

Frontend controls such as:

- selects
- filters
- forms
- editors
- configuration screens

must consume the corresponding catalog when one exists.

Do not introduce new duplicated arrays of business values when a catalog is the source of truth.

Catalog identifiers should remain stable even if their display labels change.

---

## 8. Certification domain

Certification configuration must be data-driven.

Certification behavior should be derived from configured catalog/domain data whenever possible instead of scattered conditional logic.

The implementation must support future calculations and reporting without requiring certification rules to be duplicated across UI components.

When certification rules come from an approved certification manual or supplied business documentation, that documentation is authoritative for the specific configuration it defines.

Do not invent missing certification rules.

---

## 9. Data integrity

Database constraints and backend validation should work together.

Do not rely exclusively on frontend validation.

Where applicable enforce:

- required fields
- uniqueness
- valid relationships
- valid states
- valid transitions
- organization/ownership boundaries
- foreign-key integrity
- duplicate prevention

Database initialization and migration scripts must be safe and reviewable.

Never silently destroy existing data.

Never run destructive database commands unless explicitly authorized.

---

## 10. API behavior

Maintain consistent HTTP semantics.

APIs should provide predictable:

- status codes
- validation responses
- conflict responses
- not-found behavior
- authorization behavior
- error structures

Do not expose stack traces, credentials, connection strings or internal implementation details to clients.

Keep API contracts typed and explicit.

---

## 11. Frontend engineering

BFS frontend uses React + TypeScript.

Maintain strict type safety.

Avoid:

- `any` without strong justification
- duplicated domain models
- duplicated catalog values
- unnecessary type assertions
- unresolved imports
- unsafe optional access
- inconsistent loading/error handling

New screens must account for:

- loading
- empty state
- error state
- success feedback
- validation feedback
- disabled/submitting state where applicable

Reuse existing BFS components and patterns before introducing another implementation.

---

## 12. UX consistency

Before creating a new visual pattern, inspect existing BFS components.

Maintain consistency in:

- navigation
- forms
- alerts
- tables
- pagination
- confirmation dialogs
- spacing
- hierarchy
- feedback
- responsive behavior

Do not redesign unrelated screens while implementing a scoped task.

Improvements must not break established workflows.

---

## 13. Alerts and transient UI

Alerts must not produce layout jumps, delayed repositioning or visible flicker.

Prefer stable positioning and predictable lifecycle behavior.

Any global or shared alert component must be tested against multiple pages before considering the change complete.

---

## 14. Pagination

When pagination is applicable, preserve a consistent contract between frontend and API.

Avoid loading an entire dataset merely to paginate it in the browser when server-side pagination exists or is appropriate.

Pagination, filtering and sorting must not accidentally change business results.

---

## 15. Imports and bulk operations

Bulk imports must be treated as business workflows, not simple file uploads.

Where applicable preserve:

- validation
- classification
- conflict detection
- reusable conflict decisions
- idempotency
- partial-error handling
- accurate counts
- auditability

Never report a row as successfully processed unless the corresponding operation actually succeeded.

---

## 16. Auditability

Business-sensitive operations should remain traceable where the domain requires it.

Do not remove existing audit information during migration.

Prefer explicit lifecycle changes over destructive deletion when historical preservation is required.

---

## 17. Scope discipline

Before coding, determine the minimum set of files and layers required for the requested capability.

Do NOT:

- refactor unrelated modules
- rename unrelated files
- reformat the entire repository
- update unrelated dependencies
- rewrite working components merely because another implementation is preferred

Keep diffs focused and reviewable.

---

## 18. Existing code first

Before creating a new:

- component
- hook
- service
- repository
- utility
- type
- API client
- catalog
- validation mechanism

search BFS for an existing equivalent.

Reuse or extend existing abstractions when appropriate.

Avoid parallel implementations of the same concern.

---

## 19. Secrets and sensitive configuration

Never commit:

- passwords
- tokens
- API keys
- private keys
- connection-string secrets
- production credentials
- personal access tokens

Local secrets must remain in ignored/local configuration.

Never copy secrets from another repository into BFS.

If a secret is discovered in tracked content, report it instead of propagating it.

---

## 20. Git safety

Current protected baseline for agent-assisted migration:

Branch:

`feature/talent-platform`

Baseline commit:

`eb03d2fe1f1fb19bb4b9fad041eaad540ab0c499`

Before starting a task:

- inspect `git status`
- inspect the current branch
- understand existing local modifications

Never automatically:

- reset
- force checkout
- discard user changes
- rewrite history
- force push
- delete branches

without explicit user authorization.

Do not use destructive Git commands to solve implementation problems.

---

## 21. Commit discipline

Do NOT commit or push unless explicitly requested.

When a task is complete, provide:

- summary of changes
- files changed
- validation performed
- remaining risks or limitations
- current `git status`

The user controls final commit/push unless explicitly delegating it.

---

## 22. Frontend quality gate

Before declaring a frontend-affecting task complete, run from the BFS repository root:

`npm.cmd run build`

The current build includes:

`tsc && vite build`

A frontend task is NOT complete if TypeScript or Vite build fails.

Fix errors introduced by the task before reporting completion.

---

## 23. API quality gate

Before declaring an API-affecting task complete, run from:

`BaseBFS/api`

`npm.cmd run build`

The current API build validates the Node runtime, cleans generated output and runs TypeScript compilation.

An API task is NOT complete while this build fails.

---

## 24. Generated artifacts

Generated/local build artifacts must not be committed.

`.output/` is local generated output and is ignored.

Do not introduce:

- compiled `.class` files
- build output
- dependency directories
- temporary files
- IDE metadata

into source control.

---

## 25. Definition of Done

A development task is complete only when all applicable conditions are satisfied.

### Analysis
- existing BFS implementation inspected
- reference behavior inspected when required
- scope understood
- business rules identified

### Backend/API
- contracts correct
- validation preserved
- authorization preserved
- integrity preserved
- build passes

### Frontend
- types correct
- API integration correct
- catalog usage correct
- relevant states handled
- build passes

### Integration
- frontend/backend contract aligned
- no required business rule lost
- no source-project terminology leaked
- no unrelated regressions knowingly introduced

### Repository
- `git diff` reviewed
- generated files excluded
- secrets not introduced
- no unintended reference-repository changes

Only then may the agent state that implementation is complete.

---

## 26. Failure behavior

If a build or test fails:

1. determine whether the failure existed before the task or was introduced by the task;
2. investigate the root cause;
3. fix failures introduced by the task;
4. rerun the relevant quality gate.

Do not hide errors.

Do not delete tests to make a build pass.

Do not weaken TypeScript types merely to suppress compiler errors.

Do not remove validation merely to make a workflow succeed.

---

## 27. Uncertainty

If the implementation requires a business decision that cannot be determined from:

1. BFS,
2. the reference implementation,
3. supplied business documentation,

do not invent the rule.

Clearly identify the unresolved decision and ask for clarification.

Technical implementation decisions that do not alter business behavior may be made using established BFS patterns.

---

## 28. Working method for migration tasks

For substantial migration tasks use this sequence:

DISCOVER
→ COMPARE
→ PLAN
→ IMPLEMENT
→ BUILD
→ TEST
→ REVIEW DIFF
→ REPORT

Do not begin with mass code generation.

For large tasks, provide the implementation plan before making broad cross-cutting changes.

---

## 29. Priority order

When instructions conflict, use this project priority:

1. Explicit current user instruction
2. Security and data integrity
3. Approved business documentation
4. This AGENTS.md contract
5. Existing BFS architecture and conventions
6. Reference implementation behavior
7. Agent preference

Never sacrifice security or data integrity merely to match a visual implementation.

---

## 30. Core objective

The objective is not to reproduce another application's source code.

The objective is to build BFS faster while preserving the proven business, integrity and security behavior that is applicable to BFS.

BFS remains its own product, architecture and source of truth.
## BBVA Workspace — persistencia explícita y concurrencia

- No implementar autoguardado de información funcional en BBVA Workspace. Cambios de datos maestros, catálogos, certificaciones, Talent Bank, ciclo de vida, observaciones o cualquier otro dato persistente requieren una acción explícita `Guardar`, `Confirmar`, `Aplicar` o equivalente.
- Los controles `onChange`, filtros, búsqueda, paginación, tabs y estados puramente visuales pueden actualizar UI local, pero nunca deben persistir por sí solos.
- Toda mutación BBVA debe invalidar/publicar el cambio para mantener coherencia entre vistas y pestañas abiertas.
- Los casos de edición de entidades mutables deben utilizar control optimista de versión/`UpdatedAt` cuando el repositorio lo soporte; ante una escritura obsoleta se debe rechazar con conflicto y solicitar recarga, nunca sobrescribir silenciosamente.
- Estas reglas aplican a módulos existentes y futuros de BBVA Workspace.

## UX rules — BBVA Workspace
- Every visible asynchronous/server action must expose an immediate pending state and a final success/error acknowledgement. Never leave a server-triggering click without feedback.
- A client-side choice that is not yet persisted must visibly show its selected state and explain that it will be applied only when the user confirms the server action.
- Breadcrumbs are metadata-driven navigation. Every non-current breadcrumb level must be keyboard-accessible and navigate to its real module/section destination; the current level is not a link.
- Operational list/table views keep the table as the primary content. Analytical insights belong in Panel/Métricas unless the user explicitly opens them.


## Estándares BBVA de presentación y catálogos (V24)
- Nombres de personas y roles se priorizan en MAYÚSCULAS por legibilidad corporativa. IS/XM/usuarios técnicos permanecen en mayúsculas y correos conservan su forma de email. Otros textos usan el casing natural del catálogo o frase según contexto; no se fuerza tipo oración globalmente.
- Los catálogos de negocio BBVA nunca exponen códigos editables. La UI y los contratos de alta/edición usan nombre y descripción más la configuración específica del dominio. Si persistencia o seguridad requieren una clave técnica, debe ser interna, inmutable y no presentarse como dato de catálogo.
- Estructura BBVA se administra en un único catálogo jerárquico: nivel 2 y nivel 3 con relación padre-hijo. Los formularios manuales consumen ese catálogo y los valores históricos se preservan por compatibilidad.
- Todo Panel/Métricas de certificaciones tiene un Q seleccionado. Por defecto se usa el Q actual del calendario BBVA configurado; nunca se inventan Q de años no configurados.
- La cobertura de Panel/Métricas es por Q: representa el porcentaje de certificaciones aplicables que NO vencen dentro del Q seleccionado. Si no existe ningún vencimiento en el Q, la cobertura del Q es 100%.
- Seguimiento muestra Q de vencimiento como filtro y columna. Estructura BBVA no se duplica en esa tabla y la acción Postal no se ofrece como acción rápida de seguimiento.
- Banco de talento muestra días de permanencia. Más de 60 días sin asignación activan la señal determinística «Urgente de asignar»; el número histórico de entradas no determina urgencia.
- El movimiento visual se reserva a insights y recomendaciones analíticas; KPIs, tarjetas operativas y paneles generales permanecen estáticos. Todo movimiento respeta prefers-reduced-motion.
- En dashboards se conservan únicamente KPIs esenciales; el resto vive en paneles de detalle, histórico o drill-down.

### V25 operational display and drill-down standards

- `Ver` de Colaboradores reutiliza exactamente el formulario CRUD en modo `view`: mismos campos, sólo lectura y únicamente la acción superior `Regresar`; no debe incluir CTAs a Certificaciones, Editar u otros módulos.
- Los nombres de certificaciones se muestran en MAYÚSCULAS en las superficies BBVA BFS. La persistencia no se altera por esta regla de presentación.
- El selector de Q forma parte de la misma barra de filtros de Panel y Métricas; no se crea un segundo header/strip independiente para Q.
- El KPI `Críticos 2/2` y su drill-down deben compartir el mismo predicado de backend: ciclo `FAILED`, tipo crítico, 2/2 agotados, último intento `FAILED` y resolución abierta.
- La permanencia en Banco de talento se calcula para todo registro activo desde el último hito real de entrada al Banco (`COLLABORATOR_TO_TALENT` o `ENTERED_TALENT_BANK`), con fallback a `EntryDate`; más de 60 días se marca urgente.
- En Banco de talento, la tabla principal muestra CV y el contexto expandido no duplica ese mismo dato.
### V27B — limpieza interna conservadora BBVA

- No conservar exports, hooks, helpers o wrappers frontend sin consumidores demostrables dentro del repositorio.
- La eliminación de un wrapper frontend NO implica eliminar el endpoint backend: los contratos HTTP se preservan mientras sigan formando parte del dominio o puedan ser consumidos externamente.
- Los componentes sin ruta/import runtime pueden eliminarse sólo después de verificar que ninguna prueba funcional dependa de su implementación obsoleta; las pruebas deben validar el comportamiento actual.
- La limpieza técnica no debe cambiar diseño, navegación, filtros, búsqueda, paginación ni comportamiento visible. Si una limpieza requiere un cambio UX, se entrega por separado.
- `test-bbva-dead-code-v27b.mjs` protege la ausencia de los símbolos huérfanos retirados y la permanencia de los contratos backend relacionados.

### V28 — segunda certificación tecnológica como estado derivado

- El estado derivado visible para 2 o más certificaciones tecnológicas vigentes se denomina `Doble certificación`; no usar `En regla + certificación adicional`.
- El filtro `Doble certificación` es un criterio independiente: debe encontrar a toda persona con 2+ certificaciones tecnológicas vigentes aunque su estado operativo principal sea Pendiente, Atención requerida, próxima a vencer o Crítico. El badge principal conserva la prioridad operativa para no ocultar alertas.

- La segunda certificación tecnológica no es un módulo ni un plan paralelo: se deriva exclusivamente de `PersonCertification` + `CertificationCatalog`.
- Para Colaboradores, una certificación tecnológica cuenta como cubierta cuando es aplicable, de tipo `TECHNOLOGICAL`, está aprobada y su vigencia efectiva no ha vencido; una próxima a vencer sigue siendo una certificación cubierta.
- Si al colaborador le aplica certificación tecnológica, una tecnológica cubierta satisface el mínimo. Dos o más tecnológicas cubiertas habilitan el estado derivado `Doble certificación`; el badge operativo principal puede seguir mostrando un estado de mayor prioridad (crítico, vencido/recertificación, próximo a vencer o pendiente).
- Si no le aplica certificación tecnológica, este criterio no penaliza su estado.
- No reintroducir rutas, navegación, hooks, API ni backend de `SecondCertificationPlan`; las rutas históricas redirigen a Colaboradores por retrocompatibilidad.
- `SecondTechnologyCertificationPlan` permanece solo en la migración histórica V26 para reproducibilidad del esquema; no es fuente de verdad funcional.

### V29 — persistencia de filtros por visita de módulo

- Los filtros persistentes de BBVA se conservan únicamente mientras el usuario permanece dentro del mismo módulo funcional, incluyendo sus vistas de lista, detalle, alta, edición y acciones relacionadas.
- Al navegar a otro módulo, la visita anterior se cierra. Si el usuario regresa después al módulo anterior, todos sus filtros, búsqueda, ordenamiento y paginación persistentes deben iniciar en sus valores default.
- Navegar entre vistas internas del mismo módulo NO reinicia filtros; por ejemplo, Colaboradores → Ver/Editar/Certificaciones → Regresar conserva el contexto de Colaboradores.
- Recargar la página dentro del mismo módulo puede conservar el contexto durante la misma sesión del navegador; cambiar de módulo siempre prevalece y provoca una nueva visita.
- La regla aplica tanto a estado persistido en `sessionStorage` como a filtros representados por query params. Volver mediante historial del navegador desde otro módulo no debe restaurar filtros de una visita anterior.
- El alcance se determina desde la navegación oficial (`bbvaNavigation`), no por prefijos hardcodeados independientes en cada página. Los módulos nuevos heredan este comportamiento al registrarse en la navegación y usar los hooks estándar de listas/filtros.
- No usar `localStorage` para filtros operativos BBVA. `localStorage` queda reservado a preferencias duraderas de interfaz que no son filtros, como el estado colapsado del sidebar.

### V30 — tablas limpias y paginación orientativa

- Los contenedores de tablas BBVA no repiten el nombre del módulo, la descripción de la pantalla ni frases de contexto ya evidentes por breadcrumb, filtros o métricas. Evitar encabezados como `X de Y registros en el contexto actual`, descripciones genéricas del periodo o subtítulos redundantes encima de las columnas.
- Un encabezado sobre una tabla sólo se conserva cuando cambia el significado del dataset (por ejemplo, `Certificaciones que vencen en 2026Q4`) o contiene una acción necesaria; los conteos globales corresponden a métricas o a la propia paginación.
- La vista principal de Colaboradores no muestra una columna de conteo `Certificaciones`; el estado resume la situación operativa y el detalle/menú de acciones permite consultar las certificaciones de la persona.
- `BBVAPagination` es el estándar único de paginación BBVA. La página activa debe distinguirse inequívocamente con fondo sólido corporativo, texto de alto contraste y `aria-current="page"`; nunca depender sólo de un borde sutil.
- Estas reglas aplican a módulos BBVA actuales y futuros. No implementar estilos locales de página activa ni encabezados redundantes por pantalla.
### V30.1 — headers de contexto por módulo

- Sólo los módulos bajo **Administración > Catálogos** mantienen headers de contexto/título descriptivo de módulo o de guardado.
- Fuera de Catálogos, el breadcrumb ya aporta ubicación y contexto; no repetir grupo, módulo, título ni descripción general en un header adicional.
- En listados no catálogo, los CTAs principales permanecen visibles sin necesitar un encabezado descriptivo.
- En formularios no catálogo, conservar únicamente navegación, feedback, campos y acciones; no agregar headers redundantes de “Nuevo/Editar” cuando el breadcrumb ya lo indica.
- Los encabezados de identidad o de contenido específico (persona, certificación, intento, resultado) no se consideran headers redundantes de módulo y pueden permanecer cuando aportan información operativa real.


### V30.2 — forms y tablas compactas como estándar BBVA

- Los badges abreviados de roles representan el rol, no una capacidad adicional. Se forman con las iniciales de las dos primeras palabras (`Service Manager` → `SM`, `Delivery Manager` → `DM`); `isDeliveryManager` sólo indica que el rol puede fungir como DM.
- Todo campo obligatorio en formularios BBVA actuales y futuros muestra su asterisco con `BBVARequiredMark`, en rojo visible. No usar asteriscos obligatorios negros o heredados dentro del texto del label.
- Colaboradores y Banco de talento son la referencia visual para listados BBVA: filtros compactos, controles con ancho finito, sin card/borde gris envolvente, con separación visual antes de la tabla.
- `BBVAFilterBar` es el contenedor estándar para barras de filtros adicionales. `Actualizar` y `Limpiar` se integran como acciones de la misma barra, alineadas con los filtros; no crear un segundo encabezado o franja de filtros.
- Las tablas BBVA no llevan headers descriptivos propios fuera de los catálogos. El breadcrumb, métricas o controles anteriores aportan el contexto. Las acciones de tabla se colocan de forma compacta fuera de la superficie de columnas.
- Toda tabla de listado o detalle potencialmente creciente usa `BBVAPagination`; el tamaño inicial es 10 y la página activa conserva el estándar visual/accesible global.
- Estas reglas son transversales para módulos actuales y futuros; evitar estilos locales que reintroduzcan cards de filtros anchas, headers redundantes o marcas obligatorias inconsistentes.

### V30.3 — contexto de catálogos, motion y calendarios BBVA

- Todo módulo ubicado bajo **Administración > Catálogos** muestra `BBVACatalogHeader` en sus vistas de listado, alta, edición y detalle. Es la única familia de módulos que conserva un header contextual persistente; no crear excepciones fuera de Catálogos.
- En Administración > Usuarios, los nombres de personas se presentan en MAYÚSCULAS y los roles se representan mediante sus iniciales de las dos primeras palabras (`Service Manager` → `SM`, `Delivery Manager` → `DM`). En Administración > Roles, el nombre visible del rol se presenta en MAYÚSCULAS y el badge conserva esas iniciales.
- Las tarjetas operativas, KPI, scorecards y paneles generales permanecen estáticos. El movimiento continuo se reserva exclusivamente a **insights y recomendaciones analíticas**, mediante `bbva-insight-live`, respetando `prefers-reduced-motion`.
- Todos los calendarios BBVA consumen el DatePicker compartido. El selector de años se ordena del más nuevo al más viejo. Si el campo no tiene fecha, al abrir el calendario el contexto inicia en el mes/año actual; si existe una fecha persistida, se conserva su año y mes.
- No reintroducir `bbva-live-card`, `bbva-live-panel` ni animaciones de respiración/progreso sobre tarjetas operativas comunes.

### V30.4 — jerarquía operativa de filtros, score y tablas

- En cualquier Panel, Dashboard o módulo que muestre KPIs/resúmenes operativos, la barra de filtros se presenta antes de las tarjetas. El usuario define primero el universo y después interpreta las métricas; no colocar KPIs encima de sus filtros.
- Los filtros de Tecnología de los módulos operativos BBVA son multiselect. La selección múltiple se conserva en el contexto de la visita del módulo conforme a V29 y el backend interpreta todos los valores seleccionados, no sólo el primero.
- Estructura BBVA se filtra con un único control compacto y jerárquico: Nivel 2 como padre y Nivel 3 anidado. No volver a dos selects independientes ni a una lista plana que mezcle niveles sin jerarquía visual.
- Las certificaciones con `TracksScore=true` permiten capturar `Calificación / score` de 0 a 10 en alta/edición de intento y aprobación rápida. Las certificaciones que no manejan score no muestran ni aceptan ese dato. `Score10` y `LastScore10` son la fuente persistida para métricas/promedios.
- El orden canónico de niveles es `JR → STD → SR`. `GENERIC` se coloca después cuando el dominio lo requiera y `TR` sólo permanece en contextos de formación/pre-entry donde ya exista; nunca alterar el orden JR/STD/SR.
- En toda tabla BBVA que tenga Estado/Estatus y Acciones, Estado/Estatus es la última columna de negocio e inmediatamente precede a Acciones. No insertar columnas entre ambas.
- Seguimiento no muestra una tarjeta independiente `Preparación Vendors`; Periodo y sus métricas viven en filtros/KPIs para evitar duplicidad visual.
- Estas reglas son transversales para módulos actuales y futuros.


### V31 — Gremios y Especialidades como explorador organizacional

- `Estructuras BBVA` y `Gremios y Especialidades` se presentan como **un solo módulo visible**: `Administración > Catálogos > Gremios y Especialidades`. No se agrega un segundo acceso en navegación. Las rutas históricas de `/bbva/admin/catalogs/structures/*` redirigen al módulo unificado por retrocompatibilidad.
- El módulo principal de Gremios y Especialidades **no usa tabla**. La vista operativa se construye como explorador visual con tres modos dentro de la misma pantalla: `Jerarquía`, `Mapa de calor` e `Insights`.
- La jerarquía visual autoritativa es `Estructura nivel 2 → Gremio / nivel 3 → Especialidad`. El campo histórico `EngineeringSpecialtyCatalog.N3` representa el nombre de la estructura nivel 2 y `EngineeringSpecialtyCatalog.Guild` representa el gremio/nivel 3. No mostrar esos nombres internos como una jerarquía adicional inventada.
- Las altas y ediciones de especialidad deben seleccionar nivel 2 y nivel 3 desde `StructureCatalog`; no aceptar relaciones libres que no existan o estén inactivas. El backend valida esa relación aunque el frontend use selects.
- Un cambio de nombre de Estructura nivel 2 o nivel 3 propaga la denominación correspondiente a `EngineeringSpecialtyCatalog` dentro de la misma transacción, además de la propagación histórica a `Person`. No se permiten estructuras nivel 3 eliminadas mientras tengan especialidades asociadas.
- El módulo muestra exactamente cuatro KPIs esenciales: `Gremios`, `Especialidades`, `Cobertura de colaboradores` y `Estructura BBVA`. No mostrar `Cobertura de staffer` como KPI.
- `Cobertura de colaboradores` se calcula con los **colaboradores activos**: numerador = colaboradores cuyo par `BbvaStructureLevel2 + BbvaStructureLevel3` existe como estructura activa y además tiene un gremio/especialidad activa reconocida; denominador = total de colaboradores activos. Si no hay colaboradores activos, la cobertura es 100% por convención de universo vacío.
- `Staffer` es información operativa relevante y puede aparecer en filtros, nodos, detalle e insights. `Responsable ASO` no forma parte de este módulo ni de sus KPIs.
- El mapa de calor usa la concentración real de colaboradores por nivel 3 y expone también el número de especialidades del nodo. No inventar scores, riesgos ni relaciones persona-especialidad que no existen en el modelo.
- Una persona puede mostrarse asociada a nivel 2/nivel 3 porque esos campos existen en `Person`; **no inferir que pertenece a una especialidad concreta** mientras no exista una relación explícita persona-especialidad.
- Los insights pueden señalar huecos determinísticos: nivel 3 sin especialidades, especialidades sin staffer, colaboradores fuera de la jerarquía y grupos de especialidad sin correspondencia con `StructureCatalog`.
- El módulo conserva `BBVACatalogHeader`, filtros compactos antes de los KPIs, acciones explícitas de Guardar/Confirmar y las reglas de motion V30.3: sólo los insights pueden tener movimiento continuo accesible.

### V31.1 — refinamiento visual del explorador

- El explorador `Gremios y Especialidades` mantiene el look & feel claro de BBVA. No usar barras o paneles laterales oscuros como superficie dominante.
- `Mapa de calor` es una cuadrícula compacta: cada fila contextualiza un Nivel 2 y cada celda representa un Nivel 3. La intensidad se expresa con fondos claros y bordes BBVA, nunca con tarjetas azul oscuro o texto blanco como escala principal.
- El mapa de calor conserva navegación al nodo jerárquico al hacer click, pero no se presenta como una colección de cards independientes.
- Jerarquía, Mapa de calor e Insights usan un selector segmentado claro, integrado con el resto de la plataforma.


### V31.2 — prioridad visual y ergonomía operativa

- En Gremios y Especialidades, las estructuras Nivel 2 y Nivel 3 se ordenan por defecto de mayor a menor número de colaboradores activos. Los empates se resuelven por número de especialidades y después por nombre. El mapa de calor conserva el mismo criterio para que los nodos con mayor población queden primero.
- La tabla principal de Colaboradores no separa `Rol` y `Tecnología actual` en columnas anchas. Se presenta una sola columna `Perfil / tecnología`, con perfil/rol como dato principal y tecnología + nivel como contexto secundario.
- Los selects con dropdown portaleado calculan su posición antes de abrirse. No renderizar un portal inicialmente en `(0,0)` ni permitir un destello perceptible en el borde izquierdo de la pantalla. Esta regla aplica a `BBVASearchableSelect`, `BBVAMultiSelect` y `BBVAStructureFilter`.
- En Certificaciones del colaborador, la acción `Agregar certificación` vive en la misma barra compacta de filtros/acciones de la tabla. El selector indica explícitamente que sirve para agregar y el botón usa el texto completo `Agregar certificación`.
- Los tres KPIs de Certificaciones del colaborador tienen mayor jerarquía tipográfica que los controles: etiquetas legibles, valor principal de 26px y contexto secundario reforzado.

### V31.3 — reglas operativas de seguimiento, filtros, acceso físico e importación

- Seguimiento usa una barra compacta sin encabezados redundantes ni chips de `Resultados filtrados`. Puede filtrar por intentos/criticidad (`sin intentos`, `1 intento`, `último intento disponible`, `agotados`, `críticos 2/2`) además de los filtros existentes.
- En cualquier barra de filtros BBVA actual o futura, `Estado / Estatus` es siempre el último filtro visible. Acciones como Actualizar/Limpiar pueden ir después en el área de acciones, pero ningún filtro de negocio se coloca después de Estado.
- Los badges de roles usan hasta tres iniciales significativas: `Delivery Manager → DM`, `Service Manager → SM`, `Account Delivery Manager → ADM`. No truncar roles de tres palabras a dos letras.
- `Información BBVA y accesos` contiene una subsección `Asistencia a oficina y equipo`, cerrada por default. Puede registrar días laborables, sede (`BBVA Parques Polanco`, `BBVA Torre Reforma`, `Otra`) y únicamente el tag del equipo. Son datos de `Person` y no se mezclan con identidad, estructura o certificaciones.
- En Métricas no duplicar `Vencen en periodo` con `Personas con vencimiento`. Se conserva el KPI de vencimientos y el segundo espacio se usa para `Pendientes de certificación`.
- La importación debe detectar personas que ya existen en Banco de talento aunque aparezcan nuevamente en el tablero. El estado operativo nunca se reactiva por default ni por acciones masivas de datos. Se presenta una decisión explícita `Mantener en Banco de talento / estado actual` o `Reactivar como colaborador`.
- Si una persona permanece en Banco de talento, la importación puede actualizar datos maestros aceptados de `Person` sin activar `Collaborator` ni cerrar la entrada activa de Talent Bank. Las decisiones de ciclo de vida no se reutilizan automáticamente entre importaciones.

### V31.4 — claridad operativa, filtros y ayudas contextuales

- Todo dropdown portaleado (`BBVASearchableSelect`, `BBVAMultiSelect`, `BBVAStructureFilter`) se posiciona con la altura real del panel ya renderizado. Si abre hacia arriba, su borde inferior queda cercano al control que lo originó; no usar `maxHeight` teórico para calcular la distancia vertical ni permitir listas flotando lejos del campo.
- `BBVAFilterBar` ocupa el ancho completo disponible. Cuando existe un campo de búsqueda, éste absorbe el espacio sobrante antes de dejar huecos visuales; los filtros restantes conservan ancho compacto y las acciones permanecen al extremo derecho. Es el estándar para módulos actuales y futuros.
- Todo KPI construido con `BBVAMetricCard` muestra siempre ayuda contextual mediante el icono de información, aun cuando el módulo no proporcione una definición específica. La ayuda explica qué mide, cómo se calcula, cómo interpretarlo y qué filtros/contexto afectan el valor.
- Las visualizaciones y paneles analíticos (`BBVAChartCard`, `BBVAInsightCard`) también incluyen ayuda contextual. Insights continúan siendo determinísticos y deben explicar de qué datos/reglas dependen.
- En tablas de Colaboradores, `Perfil / tecnología` usa abreviación exclusivamente visual para reducir ancho (`ANALISTA PROGRAMADOR` se omite, `DATA ENGINEER` puede mostrarse como `DATA ENG.`, `ESPECIAL` como `ESP.`, `DESARROLLADOR` como `DEV`). El valor persistido no se altera y el texto completo permanece disponible como tooltip/title.
- La cabecera local `BBVA Workspace` del sidebar y la barra de breadcrumb/contexto usan la misma altura de 40px para que la esquina y las líneas divisorias queden alineadas.


### V31.5 — ventanas iniciales de certificación por alta BBVA

- En el alta manual de un colaborador, `Fecha de alta BBVA` es obligatoria. Esta fecha es la referencia autoritativa para calcular las ventanas de sus certificaciones iniciales; no usar `Fecha de contratación Softtek` ni la fecha de creación del registro como sustituto.
- Para el primer ciclo de certificación de un nuevo ingreso se aplican estas reglas operativas:
  - Tecnológica: 30 días totales, primer intento a los 15 días.
  - Desarrollo Seguro: 90 días totales, primer intento a los 45 días.
  - Normativa & Testing: 60 días totales, primer intento a los 30 días.
  - Agile: 90 días totales, primer intento a los 45 días.
- Las cuatro reglas consideran máximo 2 intentos. El segundo intento debe quedar resuelto dentro de la fecha límite total calculada desde el alta BBVA.
- `PersonCertification.InitialDueDate` representa la fecha límite total del ciclo inicial. El primer intento se deriva como la mitad de `CertificationCatalog.InitialCompletionDays`, siempre en días calendario.
- La programación manual (`NextScheduledDate`) no se sustituye por la ventana inicial. Si existe una fecha programada explícita, se muestra como programación; en ausencia de ella se muestra el milestone automático del primer o segundo intento.
- El countdown usa la fecha operativa BBVA y puede quedar en tiempo, vencer hoy o estar fuera de tiempo. Después de aprobar, pasar de ciclo o quedar No aplica, la ventana inicial deja de ser la siguiente acción.
- Al sincronizar certificaciones por cambios de perfil/tecnología, sólo se recalcula `InitialDueDate` de registros automáticos del ciclo 1 sin aprobación y que no hayan sido conciliados por importación. Los límites importados se preservan.
- La nota de Tech Review se conserva como regla de negocio: los nuevos ingresos deben completar las certificaciones requeridas dentro de estas ventanas antes de considerarse listos para asignación. No inventar una fecha de Tech Review si no existe una fuente explícita en el sistema.


### V31.6a — tablas adaptativas y recomendaciones accionables

- Las tablas operativas deben preferir `table-auto` y columnas semánticas: nombre/perfil/estructura absorben el espacio disponible; fechas, estados, responsables cortos y acciones permanecen compactos con `whitespace-nowrap`. Evitar porcentajes rígidos cuando provoquen huecos artificiales.
- En Panel/Dashboard, las recomendaciones se consumen completas desde backend; no truncarlas artificialmente con `slice(0,n)` si existen más reglas aplicables al contexto.
- Las recomendaciones se presentan como carrusel horizontal con snap y autoavance moderado hacia la derecha. El movimiento se pausa mientras el usuario interactúa y respeta los controles manuales. No usar desplazamiento vertical/`translateY` en hover.
- Toda recomendación puede descartarse visualmente en el contexto actual o ponerse en marcha usando su target determinístico existente. Descartar no modifica reglas ni datos de negocio en backend; únicamente limpia la vista de la sesión/contexto.


### V31.7 — carrusel vivo de recomendaciones

- Las recomendaciones del Panel se calculan en backend con la data vigente del contexto y el frontend refresca el dashboard cada 20 segundos mientras la vista está activa, además de refrescar al recuperar foco. No generar recomendaciones aleatorias ni de demo.
- El backend no limita artificialmente la cantidad de recomendaciones. Además de reglas globales, puede generar focos por tecnología cuando existen varias concentraciones reales de pendientes, vencimientos, recertificaciones, alertas o críticos.
- El carrusel avanza automáticamente desde que existen al menos 2 recomendaciones, muestra una tarjeta principal con la siguiente parcialmente visible, usa escala/opacidad como profundidad y no usa movimiento vertical. Pausa durante interacción y conserva navegación manual.
- Descartar sigue siendo sólo una decisión visual de la sesión/contexto. Poner en marcha lleva al módulo operativo preservando estado y, cuando aplica, tecnología del foco.


### V31.8 — periodos operativos configurables como fuente única

- Las fechas reales de Vendors se conservan como referencia, pero toda clasificación temporal de BBVA Workspace usa la ventana operativa resuelta por `bbvaVendorCalendar`. Ningún módulo calcula límites de Q por su cuenta.
- Regla por defecto: un mes nunca se divide entre dos Q. Si un Q real inicia después del día 1, su inicio operativo es el día 1 del mes siguiente; el Q que termina conserva completo su mes de cierre y su fin operativo es el último día de ese mes. Ejemplo: inicio real Q4 23/09 -> inicio operativo 01/10; septiembre completo sigue en Q3.
- Los overrides se guardan en `bbva.OperationalQuarterConfig` y sólo aceptan inicio en día 1, fin en último día de mes y continuidad sin huecos ni traslapes. Si no existe override, se usa la sugerencia automática.
- Esta fuente domina Seguimiento, Métricas, Panel, recomendaciones, readiness Vendors, histórico/snapshots y futuros filtros por periodo.
- `EXPIRING` significa exclusivamente Próxima a vencer por ventana de alerta. `DUE_IN_PERIOD` significa Vence en el periodo seleccionado. No reutilizar un estado para ambas semánticas.
- Seguimiento debe disponer del universo aplicable completo; `Todos los estados` no puede eliminar registros Vigentes antes de aplicar el filtro de periodo. Periodo y Estado son dimensiones independientes.


### V31.10 — calendario BBVA derivado de Vendors

- Las fechas Vendors configuradas son la única fuente autoritativa del calendario Q. La ventana operativa no es un dato independiente: se deriva en backend y se materializa en SQL sólo por consistencia/consulta.
- Regla de mes completo: si un Q empieza después del día 1, operativamente inicia el día 1 del mes siguiente; si termina cualquier día de un mes, operativamente cubre hasta el último día de ese mes. Ejemplo: Q3 termina 23/09 => Q3 operativo termina 30/09 y Q4 inicia 01/10.
- Seguimiento, Métricas, Panel, readiness, asignación quarterCode y vencimientos por periodo deben consumir bbvaVendorCalendar/configuredVendorQuarters; no duplicar fechas ni fórmulas en frontend.
- Cambiar una ventana Vendors invalida snapshots históricos del Q afectado para evitar comparar métricas calculadas con fronteras distintas.
- El frontend puede mostrar una previsualización de la ventana operativa, pero no puede editarla ni enviarla como fuente de verdad.
