# Patrón de Arquitectura BBVA sobre BaseBFS / bfs_US

## Principios obligatorios

1. El Header corporativo/global de BFS es infraestructura compartida y **no se reemplaza, elimina ni duplica** dentro del módulo BBVA.
2. El módulo BBVA se monta debajo del Header global y encapsula únicamente su navegación lateral, breadcrumbs y vistas de dominio.
3. La navegación puede tener hasta tres niveles: **Grupo > Sección opcional > Módulo**.
4. El menú contiene únicamente módulos. Operaciones como Alta, Editar, Detalle, Importar, Convertir, Historial, etc. viven dentro de la vista del módulo y nunca como entradas independientes de navegación.
5. El sidebar BBVA debe poder expandirse y compactarse. En modo compacto conserva acceso visual mediante iconos.
6. Las vistas funcionales utilizan todo el ancho disponible. No se aplican `max-width` globales al contenido BBVA.
7. Se conserva un patrón visual funcional y compacto para tablas y vistas: filtros compactos, breadcrumbs, columnas de negocio, paginación, botón `Acciones` con dropdown y vistas detalle/edición separadas.
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

1. El Header global de BFS es infraestructura corporativa y no se modifica desde BBVA.
2. **BBVA Workspace opera en Light por defecto**, de forma aislada, aunque otro módulo o la plantilla BaseBFS tenga una clase global `dark`.
3. Todos los componentes BBVA incluyen variantes oscuras preparadas mediante el contenedor de tema local del módulo (`.bbva-dark`).
4. Cuando el Header global BFS exponga formalmente su estado de tema a los módulos, `BBVALayout` recibirá `light | dark` y propagará el modo sin duplicar selectores ni preferencias.
5. BBVA nunca modifica `document.documentElement`, `body`, `src/index.css` ni el estado visual de módulos ajenos.
6. El Header global continúa visible e intacto en todas las rutas `/bbva/*`.

Flujo objetivo:

```text
Header BFS global
    ↓ expone tema cuando la integración esté disponible
BBVALayout(themeMode)
    ↓
BBVA Workspace
├── Sidebar
├── Breadcrumbs
├── Tablas
├── Formularios
├── Modales
└── Vistas de negocio
```

## Estándar visual BBVA Workspace — Compact Enterprise

A partir de esta entrega, los módulos BBVA deben conservar el patrón visual compacto y adaptarlo al shell BFS:

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


## Patrón funcional — Catálogos BBVA

Los catálogos `Categorías`, `Tecnologías`, `Perfiles` y `Perfiles tecnológicos` son submódulos independientes dentro de `Administración > Catálogos`, sin una página intermedia.

Cada catálogo conserva el mismo contrato:

- Listado compacto con columnas: `Nombre`, `Cantidad de usos`, `Actualización`, `Estado`, `Acciones`.
- Búsqueda por nombre, código o descripción.
- Filtro de estado con `Activos` como valor predeterminado.
- Paginación de servidor 10/25/50/100 y ordenamiento estable.
- Acción primaria dinámica: `Agregar categoría`, `Agregar tecnología`, `Agregar perfil` o `Agregar perfil tecnológico`.
- Menú `Acciones`: Ver, Editar, Activar/Inactivar y Eliminar.
- Inactivar conserva el registro y sus referencias históricas.
- Eliminar físicamente solo se permite cuando `Cantidad de usos = 0`; cuando existen dependencias se devuelve `409 Conflict`.
- Crear y editar utilizan un formulario compacto, sin títulos redundantes, con `Regresar` y breadcrumbs del shell.
- Las rutas frontend son `/bbva/admin/catalogs/<catalogo>` y las llamadas HTTP son relativas `/api/bbva/catalogs/<catalogo>`.
- Persistencia aislada bajo schema `bbva`: `CatalogCategory`, `CatalogTechnology`, `CatalogProfile`, `CatalogTechnologyProfile`.
- SQL siempre parametrizado. Los nombres de tabla/columna dinámicos provienen exclusivamente de un mapa interno cerrado, nunca de texto libre enviado por el cliente.

Campos específicos:

- Categoría: nombre y descripción.
- Tecnología: nombre, código opcional y descripción.
- Perfil: nombre, código opcional, seniority de referencia y descripción.
- Perfil tecnológico: nombre y descripción.

Este patrón será reutilizable para nuevos catálogos sin crear dependencias en el shell global de BaseBFS.

## Patrón transversal — confirmaciones y acciones sensibles

- Toda confirmación de negocio de BBVA utiliza `ConfirmDialog`; no se crean modales aislados por pantalla ni se usa `window.confirm()`.
- `ConfirmDialog` se renderiza mediante portal sobre `document.body`, bloquea el scroll de fondo, soporta cierre con `Esc`, restaura el foco y expone semántica `alertdialog` accesible.
- El patrón visual mantiene una franja lateral con icono, título, explicación funcional, botón de cierre, `Cancelar` y una acción primaria explícita.
- Los tonos son semánticos: `danger` para eliminación/conversión irreversible, `warning` para inactivación, `success` para reactivación y `primary` para confirmaciones neutras.
- El componente compartido es la única fuente visual del patrón para Talent Bank, Colaboradores, Catálogos y Certificaciones.

## Identidad de persona — IS y fuente corporativa desacoplada

- En frontend el identificador `SofttekCode` se presenta al usuario como **IS**. El nombre técnico existente se conserva internamente para evitar una migración innecesaria de persistencia y contratos ya establecidos.
- Los formularios de Talent Bank y Colaboradores incluyen `Buscar IS` y consumen `/api/bbva/identity-directory/{is}` mediante ruta relativa.
- La fuente corporativa real todavía no está definida. El backend expone una capa anti-corrupción mediante `BbvaIdentityDirectoryProvider`, que deberá adaptarse a la fuente oficial cuando sea confirmada.
- Hasta configurar un provider, la API responde de forma explícita que la fuente no está configurada; no se simulan datos ni se inventa un catálogo externo.
- El contrato canónico permite hidratar, cuando estén disponibles, usuario corporativo, correo, nombre, apellidos, perfil, perfil tecnológico, tecnología actual, expertise y fecha de contratación.

## Catálogo de certificaciones — superficie operativa

- `Código` deja de ser un dato capturable o visible. Se mantiene únicamente como identificador técnico interno para compatibilidad con la persistencia existente y se genera en backend al crear una certificación.
- La tabla operativa no muestra `Configuración` ni `Perfiles`; muestra Certificación, Tipo, Tecnología/Certificadora, Estado y Acciones.
- El formulario no muestra `Grupo de requisito`, `Mínimo del grupo` ni `Perfiles aplicables`.
- Al editar registros previamente configurados se preservan internamente las reglas históricas que ya existían, evitando pérdida silenciosa de información por el cambio de superficie operativa.

## Integridad — Cantidad de usos

- `Cantidad de usos` debe representar todas las referencias relacionales conocidas que impiden el borrado, no solamente las referencias desde `bbva.Person`.
- Para `Perfiles`, el conteo incorpora también `bbva.CertificationProfileRule`.
- Para `Tecnologías`, el conteo incorpora también `bbva.CertificationCatalog`.
- El borrado continúa bloqueado con `409 Conflict` cuando el conteo real es mayor que cero. Así, la interfaz no debe mostrar `0` mientras exista una dependencia que impida la eliminación.
