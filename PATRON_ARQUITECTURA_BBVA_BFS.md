# Patrón de Arquitectura BBVA sobre BaseBFS / bfs_US

## Principios obligatorios

1. El Header corporativo/global de BFS es infraestructura compartida y **no se reemplaza, elimina ni duplica** dentro del módulo BBVA.
2. El módulo BBVA se monta debajo del Header global y encapsula únicamente su navegación lateral, breadcrumbs y vistas de dominio.
3. La navegación puede tener hasta tres niveles: **Grupo > Sección opcional > Módulo**.
4. El menú contiene únicamente módulos. Operaciones como Alta, Editar, Detalle, Importar, Convertir, Historial, etc. viven dentro de la vista del módulo y nunca como entradas independientes de navegación.
5. El sidebar BBVA debe poder expandirse y compactarse. En modo compacto conserva acceso visual mediante iconos.
6. Las vistas funcionales utilizan todo el ancho disponible. No se aplican `max-width` globales al contenido BBVA.
7. Se conserva el patrón visual funcional de NexoSkill para tablas y vistas: filtros compactos, breadcrumbs, columnas de negocio, paginación, botón `Acciones` con dropdown y vistas detalle/edición separadas.
8. No se modifica `src/index.css` con estilos ad-hoc. Se utilizan Tailwind y tokens existentes de BaseBFS.
9. El frontend BBVA continúa encapsulado en `src/pagesBBVATalent/` y `src/componentsBBVATalent/`.
10. El backend BBVA continúa encapsulado en `api/src/functions/bbva*.ts` y `api/src/lib/bbva*.ts`.
11. La persistencia del dominio se mantiene bajo schema SQL `bbva`.
12. Las llamadas frontend usan rutas relativas `/api/...`; nunca hosts o puertos locales hardcodeados.

## Estructura de shell

```text
Header BFS global (obligatorio)
└── BBVA Workspace
    ├── Sidebar BBVA expandible/compactable
    ├── Context bar + breadcrumbs
    └── Vista del módulo a ancho completo
```

## Navegación funcional

```text
Dashboard
Administración
├── Usuarios
└── Roles
Talent
├── Colaboradores
└── Talent Bank
Catálogos
├── Categorías
├── Tecnologías
├── Perfiles
└── Perfiles tecnológicos
Banco de Preguntas
├── Preguntas
├── Formularios
└── Colecciones
Evaluaciones
├── Evaluaciones
└── Paths
Certificaciones
└── Gestión
    ├── Certificaciones
    ├── Seguimiento
    └── Métricas
Reportes
└── Por dominio
    ├── Talent
    ├── Colaboradores
    ├── Evaluaciones
    └── Certificaciones
Ayuda
└── Recursos
    ├── Documentación
    ├── Soporte
    └── Acerca de
```

## Regla de vistas

Cada módulo tiene una vista principal. Desde ella se ejecutan las operaciones relacionadas mediante botones, dropdowns, modales y rutas internas.

Ejemplo:

```text
Colaboradores
├── tabla principal
├── Cargar Excel
├── Crear colaborador
├── Acciones
│   ├── Ver
│   ├── Editar
│   ├── Gestionar
│   ├── Certificaciones
│   └── Eliminar definitivamente
└── rutas internas de detalle/edición/importación
```

Estas operaciones no generan elementos adicionales en el sidebar.

## Tema visual global BFS

1. El selector de tema pertenece al **Header global de BFS**. El módulo BBVA no implementa ni persiste un selector de tema propio.
2. El módulo BBVA debe reaccionar a la clase global `dark` configurada por BFS/Tailwind (`darkMode: 'class'`).
3. El estado por defecto del módulo es **Light**: fondo blanco/gris muy claro, superficies blancas, texto slate oscuro.
4. Cuando el shell global aplica `dark`, todas las superficies, tablas, formularios, dropdowns, modales, breadcrumbs y navegación BBVA deben cambiar a sus variantes `dark:*`.
5. Nunca se debe forzar `document.documentElement.classList.add('dark')` desde código BBVA ni guardar una preferencia de tema dentro del módulo.
6. El Header global se conserva intacto para que la misma configuración visual gobierne todos los módulos de `bfs_US`.
7. Los componentes BBVA reutilizables deben incluir sus variantes Light/Dark dentro de `componentsBBVATalent/` para no depender de estilos ad-hoc globales.

Flujo esperado:

```text
Header BFS global
    ↓ selecciona Light / Dark
clase global `dark` (cuando aplica)
    ↓
BBVA Layout
├── Sidebar
├── Breadcrumbs
├── Tablas
├── Formularios
├── Modales
└── Vistas de negocio
```

## Estándar visual BBVA Workspace — NexoSkill compact

A partir de esta entrega, los módulos BBVA deben conservar el patrón visual funcional de NexoSkill y adaptarlo al shell BFS:

- El Header global de BFS es obligatorio y no se duplica ni se reemplaza dentro del módulo.
- El tema pertenece al Header/shell global. BBVA Workspace no mantiene estado de tema propio: Light es el valor por defecto y todos los componentes deben responder a la clase global `dark` mediante utilidades Tailwind `dark:*`.
- La navegación lateral es propia del dominio BBVA, pero puede compactarse/expandirse. El branding interno se limita a `BBVA Workspace`.
- El menú representa módulos, nunca operaciones. Alta, edición, detalle, importación, conversiones y otras acciones son rutas internas y aparecen únicamente en breadcrumbs.
- Las páginas de listado no repiten el nombre del módulo con un título grande. El breadcrumb del shell identifica el contexto.
- Los listados ocupan el máximo ancho disponible y utilizan densidad compacta: encabezados de 9–10 px, filas aproximadas de 39 px, filtros de 32 px y acciones en menú desplegable.
- Cada módulo ofrece su acción primaria en la esquina superior derecha (`Agregar talento`, `Agregar colaborador`, etc.). Las acciones secundarias como `Cargar Excel` aparecen junto a la acción primaria cuando correspondan.
- Las tablas incluyen paginación compacta y selector 10/25/50/100.
- Las vistas Nuevo/Editar/Detalle muestran siempre `Regresar`, breadcrumb compacto y no duplican títulos de página.
- Los mensajes de éxito, error e información usan alertas integradas; no se utiliza `window.alert()` para UX de negocio.
- Los formularios mantienen secciones internas cuando ayudan a escanear información, pero usan controles compactos y anchos acordes al dato.

---

## Navegación, tema y asistente global BBVA Workspace

A partir de esta entrega, el shell funcional BBVA utiliza el siguiente orden oficial:

1. Dashboard
2. Talent
3. Certificaciones
4. Reportes
5. Estudio
   - Evaluaciones
   - Banco de Preguntas
6. Administración
   - Usuarios
   - Roles
   - Catálogos
     - Categorías
     - Tecnologías
     - Perfiles
     - Perfiles tecnológicos

### Tema visual

- El estado base del módulo BBVA es **Light** y todos sus contenedores deben renderizar en blanco o superficies claras.
- El módulo no mantiene un estado de tema propio ni agrega un selector de tema.
- Los componentes deben incluir variantes Tailwind `dark:*` desde su creación.
- Cuando el Header global BFS aplique el modo oscuro mediante la clase global `dark`, BBVA Workspace heredará esa configuración automáticamente.
- El Header global BFS permanece fuera del dominio BBVA y no debe duplicarse ni reemplazarse.

### Asistente de IA

- El asistente se considera una capacidad transversal de BBVA Workspace y no una entrada del menú.
- Se monta una sola vez desde `BBVALayout` para que esté disponible desde cualquier ruta `/bbva/*`.
- Su UI debe ser contextual a la ruta actual y preparada para una integración posterior con el proveedor de IA autorizado por BFS.
- En esta fase no realiza llamadas a backend ni contiene credenciales.

### Branding

El nombre visible del workspace es **BBVA Workspace**. No utilizar `Talent Platform` como branding del shell BBVA.
