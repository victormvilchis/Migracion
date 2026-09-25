# Guía de Integración: De BaseBFS a bfs_US (Producción)

Esta guía establece el protocolo y las reglas de diseño para que cualquier equipo que desarrolle una nueva aplicación o módulo dentro de **BaseBFS** pueda entregarlo y sea integrado al repositorio principal **`bfs_US`** en minutos, sin conflictos y sin comprometer el código existente.

---

## 🎯 Principio de Aislamiento Modular

Para que la integración sea directa (copy-paste de carpetas), cada equipo debe encapsular todo su trabajo siguiendo estas convenciones de nombres:

### 1. Frontend (`src/`)

| Qué creas | Dónde ubicarlo en BaseBFS | Dónde se copiará en `bfs_US` |
|-----------|---------------------------|------------------------------|
| **Páginas del módulo** | `src/pagesNombreModulo/` | `src/pagesNombreModulo/` |
| **Componentes del módulo** | `src/componentsNombreModulo/` | `src/componentsNombreModulo/` |
| **Hooks personalizados** | `src/pagesNombreModulo/hooks/` o `src/hooks/useNombreModulo.ts` | Misma ruta relativa |
| **Servicios / API local** | `src/pagesNombreModulo/api/` o `src/lib/nombreModuloApi.ts` | Misma ruta relativa |

> ⚠️ **Regla de Oro:** **No modifiques `src/index.css` con estilos ad-hoc**. Utiliza las clases utilitarias estándar de Tailwind CSS o tokens ya presentes en `tailwind.config.js`.

### 2. Backend (`api/`)

| Qué creas | Dónde ubicarlo en BaseBFS | Dónde se copiará en `bfs_US` |
|-----------|---------------------------|------------------------------|
| **Azure Functions (Endpoints)** | `api/src/functions/nombreModulo*.ts` | `api/src/functions/nombreModulo*.ts` |
| **Lógica / Repositorios** | `api/src/lib/nombreModuloService.ts` | `api/src/lib/nombreModuloService.ts` |
| **Scripts de Base de Datos** | `api/scripts/init-nombre-modulo.sql` | `api/src/migrations/XXX_nombre_modulo.sql` |

> ℹ️ **Carga Automática:** Las Azure Functions en `api/src/functions/*.ts` son descubiertas y registradas automáticamente por `bootstrap.js` en ambos proyectos. No es necesario registrarlas manualmente en ningún archivo central.

---

## 📦 Protocolo de Entrega (Qué debe entregar el equipo)

Cuando el equipo finalice su aplicación, debe entregar un paquete o Pull Request conteniendo **únicamente** sus archivos de dominio:

```text
entrega-nombre-modulo/
├── src/
│   ├── pagesNombreModulo/         # Vistas de la aplicación
│   └── componentsNombreModulo/    # Componentes reutilizables
├── api/
│   ├── src/
│   │   ├── functions/
│   │   │   └── nombreModulo*.ts   # Endpoints creados
│   │   └── lib/
│   │       └── nombreModulo*.ts   # Repositorios / Servicios creados
│   └── scripts/
│       └── init-nombre-modulo.sql # DDL de tablas creadas en SQL Server
└── NOTAS_ENTREGA.md               # Variables de entorno adicionales si las hay
```

---

## 🚀 Pasos de Integración en `bfs_US` (Para el Responsable del Proyecto)

Una vez recibidos los archivos del equipo, la integración en `bfs_US` toma menos de 5 minutos:

### Paso 1: Copiar los Archivos
1. Copia `pagesNombreModulo/` y `componentsNombreModulo/` a `bfs_US/src/`.
2. Copia `api/src/functions/nombreModulo*.ts` a `bfs_US/api/src/functions/`.
3. Copia `api/src/lib/nombreModulo*.ts` a `bfs_US/api/src/lib/`.

### Paso 2: Registrar la Ruta en `App.tsx` de `bfs_US`
Abre `bfs_US/src/App.tsx` y agrega el import perezoso (Lazy Loading) y la ruta protegida:

```tsx
// 1. Import con React.lazy
const PaginaNombreModulo = React.lazy(() => import('./pagesNombreModulo/PaginaPrincipal'));

// 2. Ruta dentro del enrutador de bfs_US
<Route 
  path="/nombre-modulo" 
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <PaginaNombreModulo />
    </Suspense>
  } 
/>
```

### Paso 3: Ejecutar Migraciones SQL en Azure SQL
Abre Azure Data Studio o el portal de Azure SQL y ejecuta el contenido del script SQL entregado por el equipo (`init-nombre-modulo.sql`). Como se desarrolló contra SQL Server 2022 local, la sintaxis T-SQL es 100% compatible.

### Paso 4: Variables de Entorno en Azure
Si el módulo requiere variables específicas (además de `AZURE_OPENAI_KEY` y `AZURE_SQL_CONNECTION_STRING` que ya existen en producción), agrégalas en los Application Settings de Azure Functions.

### Paso 5: Validar Compilación
Ejecuta en la raíz de `bfs_US`:
```bash
npm run build
cd api && npm run build
```
¡Listo! El módulo queda desplegado en la siguiente iteración de CI/CD hacia Azure Static Web Apps.

---

## 🛡️ Checklist de Calidad antes de la Entrega

Antes de que el equipo entregue su desarrollo, debe verificar:

- [ ] **Sin Secretos Hardcodeados:** Ningún token, API key ni string de conexión debe estar escrito en el código fuente.
- [ ] **TypeScript estricto:** Ejecutar `npm run build` en frontend y en `api/` sin errores de tipado.
- [ ] **Rutas relativas de API:** Todas las llamadas fetch deben usar `/api/nombre-modulo` (nunca `http://localhost:7071/...`).
- [ ] **SQL Parametrizado:** Todas las consultas en `mssql` deben usar `@param` en lugar de concatenación de strings para prevenir inyecciones SQL.
- [ ] **Diseño Responsivo:** Los componentes deben adaptarse correctamente a resoluciones móviles y de escritorio mediante Tailwind CSS.
