# PatrÃ³n de Arquitectura BBVA sobre BaseBFS / bfs_US

## Principios obligatorios

1. El Header corporativo/global de BFS es infraestructura compartida y **no se reemplaza, elimina ni duplica** dentro del mÃ³dulo BBVA.
2. El mÃ³dulo BBVA se monta debajo del Header global y encapsula Ãºnicamente su navegaciÃ³n lateral, breadcrumbs y vistas de dominio.
3. La navegaciÃ³n puede tener hasta tres niveles: **Grupo > SecciÃ³n opcional > MÃ³dulo**.
4. El menÃº contiene Ãºnicamente mÃ³dulos. Operaciones como Alta, Editar, Detalle, Importar, Convertir, Historial, etc. viven dentro de la vista del mÃ³dulo y nunca como entradas independientes de navegaciÃ³n.
5. El sidebar BBVA debe poder expandirse y compactarse. En modo compacto conserva acceso visual mediante iconos.
6. Las vistas funcionales utilizan todo el ancho disponible. No se aplican `max-width` globales al contenido BBVA.
7. Se conserva el patrÃ³n visual funcional de NexoSkill para tablas y vistas: filtros compactos, breadcrumbs, columnas de negocio, paginaciÃ³n, botÃ³n `Acciones` con dropdown y vistas detalle/ediciÃ³n separadas.
8. No se modifica `src/index.css` con estilos ad-hoc. Se utilizan Tailwind y tokens existentes de BaseBFS.
9. El frontend BBVA continÃºa encapsulado en `src/pagesBBVATalent/` y `src/componentsBBVATalent/`.
10. El backend BBVA continÃºa encapsulado en `api/src/functions/bbva*.ts` y `api/src/lib/bbva*.ts`.
11. La persistencia del dominio se mantiene bajo schema SQL `bbva`.
12. Las llamadas frontend usan rutas relativas `/api/...`; nunca hosts o puertos locales hardcodeados.

## Estructura de shell

```text
Header BFS global (obligatorio)
â””â”€â”€ BBVA Workspace
    â”œâ”€â”€ Sidebar BBVA expandible/compactable
    â”œâ”€â”€ Context bar + breadcrumbs
    â””â”€â”€ Vista del mÃ³dulo a ancho completo
```

## NavegaciÃ³n funcional

```text
Dashboard
AdministraciÃ³n
â”œâ”€â”€ Usuarios
â””â”€â”€ Roles
Talent
â”œâ”€â”€ Colaboradores
â””â”€â”€ Talent Bank
CatÃ¡logos
â”œâ”€â”€ CategorÃ­as
â”œâ”€â”€ TecnologÃ­as
â”œâ”€â”€ Perfiles
â””â”€â”€ Perfiles tecnolÃ³gicos
Banco de Preguntas
â”œâ”€â”€ Preguntas
â”œâ”€â”€ Formularios
â””â”€â”€ Colecciones
Evaluaciones
â”œâ”€â”€ Evaluaciones
â””â”€â”€ Paths
Certificaciones
â””â”€â”€ GestiÃ³n
    â”œâ”€â”€ Certificaciones
    â”œâ”€â”€ Seguimiento
    â””â”€â”€ MÃ©tricas
Reportes
â””â”€â”€ Por dominio
    â”œâ”€â”€ Talent
    â”œâ”€â”€ Colaboradores
    â”œâ”€â”€ Evaluaciones
    â””â”€â”€ Certificaciones
Ayuda
â””â”€â”€ Recursos
    â”œâ”€â”€ DocumentaciÃ³n
    â”œâ”€â”€ Soporte
    â””â”€â”€ Acerca de
```

## Regla de vistas

Cada mÃ³dulo tiene una vista principal. Desde ella se ejecutan las operaciones relacionadas mediante botones, dropdowns, modales y rutas internas.

Ejemplo:

```text
Colaboradores
â”œâ”€â”€ tabla principal
â”œâ”€â”€ Cargar Excel
â”œâ”€â”€ Crear colaborador
â”œâ”€â”€ Acciones
â”‚   â”œâ”€â”€ Ver
â”‚   â”œâ”€â”€ Editar
â”‚   â”œâ”€â”€ Gestionar
â”‚   â”œâ”€â”€ Certificaciones
â”‚   â””â”€â”€ Eliminar definitivamente
â””â”€â”€ rutas internas de detalle/ediciÃ³n/importaciÃ³n
```

Estas operaciones no generan elementos adicionales en el sidebar.

## Tema visual global BFS

1. El Header global de BFS es infraestructura corporativa y no se modifica desde BBVA.
2. **BBVA Workspace opera en Light por defecto**, de forma aislada, aunque otro mÃ³dulo o la plantilla BaseBFS tenga una clase global `dark`.
3. Todos los componentes BBVA incluyen variantes oscuras preparadas mediante el contenedor de tema local del mÃ³dulo (`.bbva-dark`).
4. Cuando el Header global BFS exponga formalmente su estado de tema a los mÃ³dulos, `BBVALayout` recibirÃ¡ `light | dark` y propagarÃ¡ el modo sin duplicar selectores ni preferencias.
5. BBVA nunca modifica `document.documentElement`, `body`, `src/index.css` ni el estado visual de mÃ³dulos ajenos.
6. El Header global continÃºa visible e intacto en todas las rutas `/bbva/*`.

Flujo objetivo:

```text
Header BFS global
    â†“ expone tema cuando la integraciÃ³n estÃ© disponible
BBVALayout(themeMode)
    â†“
BBVA Workspace
â”œâ”€â”€ Sidebar
â”œâ”€â”€ Breadcrumbs
â”œâ”€â”€ Tablas
â”œâ”€â”€ Formularios
â”œâ”€â”€ Modales
â””â”€â”€ Vistas de negocio
```

## EstÃ¡ndar visual BBVA Workspace â€” NexoSkill compact

A partir de esta entrega, los mÃ³dulos BBVA deben conservar el patrÃ³n visual funcional de NexoSkill y adaptarlo al shell BFS:

- El Header global de BFS es obligatorio y no se duplica ni se reemplaza dentro del mÃ³dulo.
- El tema pertenece al Header/shell global. BBVA Workspace no mantiene estado de tema propio: Light es el valor por defecto y todos los componentes deben responder a la clase global `dark` mediante utilidades Tailwind `dark:*`.
- La navegaciÃ³n lateral es propia del dominio BBVA, pero puede compactarse/expandirse. El branding interno se limita a `BBVA Workspace`.
- El menÃº representa mÃ³dulos, nunca operaciones. Alta, ediciÃ³n, detalle, importaciÃ³n, conversiones y otras acciones son rutas internas y aparecen Ãºnicamente en breadcrumbs.
- Las pÃ¡ginas de listado no repiten el nombre del mÃ³dulo con un tÃ­tulo grande. El breadcrumb del shell identifica el contexto.
- Los listados ocupan el mÃ¡ximo ancho disponible y utilizan densidad compacta: encabezados de 9â€“10 px, filas aproximadas de 39 px, filtros de 32 px y acciones en menÃº desplegable.
- Cada mÃ³dulo ofrece su acciÃ³n primaria en la esquina superior derecha (`Agregar talento`, `Agregar colaborador`, etc.). Las acciones secundarias como `Cargar Excel` aparecen junto a la acciÃ³n primaria cuando correspondan.
- Las tablas incluyen paginaciÃ³n compacta y selector 10/25/50/100.
- Las vistas Nuevo/Editar/Detalle muestran siempre `Regresar`, breadcrumb compacto y no duplican tÃ­tulos de pÃ¡gina.
- Los mensajes de Ã©xito, error e informaciÃ³n usan alertas integradas; no se utiliza `window.alert()` para UX de negocio.
- Los formularios mantienen secciones internas cuando ayudan a escanear informaciÃ³n, pero usan controles compactos y anchos acordes al dato.


## PatrÃ³n funcional â€” CatÃ¡logos BBVA

Los catÃ¡logos `CategorÃ­as`, `TecnologÃ­as`, `Perfiles` y `Perfiles tecnolÃ³gicos` son submÃ³dulos independientes dentro de `AdministraciÃ³n > CatÃ¡logos`, sin una pÃ¡gina intermedia.

Cada catÃ¡logo conserva el mismo contrato:

- Listado compacto con columnas: `Nombre`, `Cantidad de usos`, `ActualizaciÃ³n`, `Estado`, `Acciones`.
- BÃºsqueda por nombre, cÃ³digo o descripciÃ³n.
- Filtro de estado con `Activos` como valor predeterminado.
- PaginaciÃ³n de servidor 10/25/50/100 y ordenamiento estable.
- AcciÃ³n primaria dinÃ¡mica: `Agregar categorÃ­a`, `Agregar tecnologÃ­a`, `Agregar perfil` o `Agregar perfil tecnolÃ³gico`.
- MenÃº `Acciones`: Ver, Editar, Activar/Inactivar y Eliminar.
- Inactivar conserva el registro y sus referencias histÃ³ricas.
- Eliminar fÃ­sicamente solo se permite cuando `Cantidad de usos = 0`; cuando existen dependencias se devuelve `409 Conflict`.
- Crear y editar utilizan un formulario compacto, sin tÃ­tulos redundantes, con `Regresar` y breadcrumbs del shell.
- Las rutas frontend son `/bbva/admin/catalogs/<catalogo>` y las llamadas HTTP son relativas `/api/bbva/catalogs/<catalogo>`.
- Persistencia aislada bajo schema `bbva`: `CatalogCategory`, `CatalogTechnology`, `CatalogProfile`, `CatalogTechnologyProfile`.
- SQL siempre parametrizado. Los nombres de tabla/columna dinÃ¡micos provienen exclusivamente de un mapa interno cerrado, nunca de texto libre enviado por el cliente.

Campos especÃ­ficos:

- CategorÃ­a: nombre y descripciÃ³n.
- TecnologÃ­a: nombre, cÃ³digo opcional y descripciÃ³n.
- Perfil: nombre, cÃ³digo opcional, seniority de referencia y descripciÃ³n.
- Perfil tecnolÃ³gico: nombre y descripciÃ³n.

Este patrÃ³n serÃ¡ reutilizable para nuevos catÃ¡logos sin crear dependencias en el shell global de BaseBFS.


## Sistema de alertas y notificaciones BBVA

Regla transversal de BBVA Workspace:

1. Las confirmaciones, errores, advertencias e informaciÃ³n de operaciÃ³n deben mostrarse como notificaciones emergentes tipo toast.
2. El toast debe aparecer sobre el contenido del mÃ³dulo sin desplazar tablas, formularios ni layouts.
3. Debe incluir siempre un control de cierre manual.
4. Debe cerrarse automÃ¡ticamente mediante temporizador, salvo que el caso funcional se marque explÃ­citamente como persistente.
5. El tiempo restante debe ser perceptible mediante una barra de progreso.
6. El temporizador se pausa durante hover o foco para permitir lectura y accesibilidad.
7. No se utilizarÃ¡n `window.alert`, `window.confirm` ni mensajes inline para confirmaciones de operaciÃ³n normales.
8. Los modales siguen reservados para confirmaciones destructivas o decisiones que requieran una acciÃ³n explÃ­cita.
9. El componente estÃ¡ndar es `src/componentsBBVATalent/BBVAAlert.tsx` y debe reutilizarse en todos los mÃ³dulos BBVA.
10. Este sistema permanece encapsulado en BBVA Workspace y no modifica el sistema global de notificaciones de BaseBFS/bfs_US.
