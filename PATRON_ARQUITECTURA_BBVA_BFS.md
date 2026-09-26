# Patrón de Arquitectura BBVA sobre BaseBFS / bfs_US

## 1. Objetivo

El dominio BBVA debe desarrollarse como un módulo autocontenido que pueda integrarse en `bfs_US` mediante copia de carpetas y registro mínimo de rutas, sin modificar infraestructura compartida.

## 2. Regla de aislamiento

### Frontend portable

```text
src/
├── pagesBBVATalent/
│   ├── talentBank/
│   ├── collaborators/
│   ├── hooks/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   └── lib/
└── componentsBBVATalent/
    ├── BBVALayout.tsx
    ├── BBVAHeader.tsx
    ├── BBVASidebar.tsx
    └── componentes compartidos del dominio
```

`BBVALayout`, `BBVAHeader` y `BBVASidebar` pertenecen al dominio BBVA y pueden evolucionar sin modificar el shell global de BFS.

`src/App.tsx` y `src/components/layout/Sidebar.tsx` son únicamente puntos de integración local. No forman parte del paquete portable del dominio.

### Backend portable

```text
api/src/
├── functions/
│   ├── bbvaTalentBank.ts
│   └── bbvaCollaborators.ts
└── lib/
    ├── bbvaTalentService.ts
    ├── bbvaTalentRepository.ts
    ├── bbvaCollaboratorService.ts
    ├── bbvaCollaboratorRepository.ts
    ├── bbvaTalentConversionService.ts
    ├── bbvaTalentConversionRepository.ts
    ├── bbvaTalentDomain.ts
    ├── bbvaCollaboratorDomain.ts
    └── bbvaHttp.ts
```

Las Azure Functions son adaptadores HTTP delgados. Las reglas de negocio viven en servicios y la persistencia en repositorios.

## 3. Integración entre módulos BBVA

Talent Bank y Colaboradores son subdominios distintos, pero comparten la identidad `Person`.

Las operaciones que cruzan ambos módulos no deben ejecutarse directamente desde un repositorio de un módulo. Se implementan como workflow/caso de uso independiente.

Ejemplo:

```text
POST /api/bbva/talent-bank/{id}/convert
            ↓
bbvaTalentConversionService
            ↓
bbvaTalentConversionRepository
            ↓
Transacción SQL única
```

## 4. Convención SQL

Todo objeto de negocio BBVA vive bajo el schema SQL:

```text
bbva
```

Tablas actuales:

```text
bbva.Person
bbva.TalentBankEntry
bbva.PersonDocument
bbva.TalentHistory
bbva.Collaborator
bbva.CollaboratorHistory
```

### Nombres de objetos

```text
PK_BBVA_<Tabla>
FK_BBVA_<TablaHija>_<TablaPadre>
DF_BBVA_<Tabla>_<Campo>
CK_BBVA_<Tabla>_<Regla>
UX_BBVA_<Tabla>_<Campos>
IX_BBVA_<Tabla>_<Campos>
```

El schema `bbva` es la frontera principal para evitar colisiones con otros módulos de `bfs_US`.

## 5. SQL y transacciones

- SQL siempre parametrizado mediante `mssql` y `@param`.
- Operaciones de múltiples tablas se ejecutan dentro de una transacción.
- Scripts DDL usan `SET XACT_ABORT ON` y `TRY/CATCH`.
- La ejecución local debe usar `sqlcmd -b` para detenerse ante cualquier error.
- El script entregable a producción no debe asumir el nombre de una base de datos local.

## 6. Frontend

- Tailwind CSS exclusivamente para estilos del dominio.
- No modificar `src/index.css` para estilos BBVA ad-hoc.
- No hardcodear `localhost:7071`; los clientes usan rutas relativas `/api/bbva/...`.
- TanStack React Query maneja fetching, caché e invalidaciones.
- Los componentes compartidos entre Talent Bank y Colaboradores permanecen en `componentsBBVATalent`.
- El shell BBVA es responsive e independiente del header/sidebar global de BaseBFS.

## 7. Backend

Flujo obligatorio:

```text
Azure Function
    ↓
Application Service
    ↓
Repository
    ↓
Azure SQL / SQL Server
```

No colocar SQL directamente en Azure Functions.

## 8. Rutas

Frontend:

```text
/bbva/talent-bank
/bbva/collaborators
```

Backend:

```text
/api/bbva/talent-bank
/api/bbva/collaborators
```

Todo nuevo módulo BBVA debe respetar el prefijo `/bbva` para evitar colisiones.

## 9. Infraestructura que el dominio no modifica

Salvo requerimiento explícito de la plataforma, el módulo BBVA no debe modificar:

```text
src/index.css
tailwind.config.js
api/bootstrap.js
api/src/lib/db.ts
api/src/lib/authzLocal.ts
docker-compose.yml
```

## 10. Entrega a bfs_US

El paquete productivo contiene únicamente:

```text
src/pagesBBVATalent/
src/componentsBBVATalent/
api/src/functions/bbva*.ts
api/src/lib/bbva*.ts
api/scripts/init-bbva-talent.sql
NOTAS_ENTREGA.md
```

Los archivos globales utilizados para ejecutar BaseBFS localmente no se copian a producción.

## 11. Patrón para módulos futuros

Certificaciones, Evaluaciones, Paths y demás capacidades deberán seguir exactamente la misma estrategia:

- páginas bajo un namespace BBVA;
- componentes BBVA encapsulados;
- Azure Functions con prefijo `bbva`;
- servicios/repositorios con prefijo `bbva`;
- tablas dentro del schema `bbva`;
- integración entre subdominios mediante servicios/workflows, no acceso cruzado informal a repositorios.
