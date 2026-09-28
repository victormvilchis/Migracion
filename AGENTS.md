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

`8fe772db94e10df2b27a2bc13669df361a662408`

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
- El movimiento visual debe ser perceptible pero no distractor: respiración ligera de tarjetas, progreso Q animado e indicadores vivos, siempre respetando prefers-reduced-motion.
- En dashboards se conservan únicamente KPIs esenciales; el resto vive en paneles de detalle, histórico o drill-down.
