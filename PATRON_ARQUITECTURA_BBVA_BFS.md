# Patrón de Arquitectura BBVA sobre BaseBFS / bfs_US


## Regla transversal: no redundancia de contexto ni microcopy

- El shell, la navegación lateral y los breadcrumbs ya identifican el módulo y la ubicación actual. Las vistas no deben repetir ese mismo contexto con héroes, subtítulos o encabezados equivalentes.
- Evitar combinaciones como `Panel ejecutivo` + `Talento y certificaciones` cuando el breadcrumb ya indica `Panel`, o `Cobertura` + `Estado general de certificaciones` cuando ambos textos expresan la misma idea.
- Una vista puede mostrar un título interno únicamente cuando aporta información nueva que el breadcrumb no comunica. Si el texto no agrega significado funcional, se elimina.
- Las tarjetas no deben repetir la misma métrica en el título, subtítulo y ayuda. Cada texto visible debe aportar información distinta y accionable.
- No usar microcopy promocional, autodescriptivo o de relleno en pantallas operativas.
- Esta regla aplica a todos los módulos actuales y futuros de BBVA Workspace.

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
- Las vistas Nuevo/Editar/Ver/Eliminar conservan breadcrumb compacto y no duplican títulos de página; Ver y Eliminar reutilizan el mismo formulario bloqueado mediante el patrón CRUD unificado.
- Los mensajes de éxito, error e información usan alertas integradas; no se utiliza `window.alert()` para UX de negocio.
- Los formularios mantienen secciones internas cuando ayudan a escanear información, pero usan controles compactos y anchos acordes al dato.


## Patrón funcional — Catálogos BBVA

Los catálogos `Categorías`, `Tecnologías`, `Perfiles` y `Perfiles tecnológicos` son submódulos independientes dentro de `Administración > Catálogos`, sin una página intermedia.

Cada catálogo conserva el mismo contrato:

- Listado compacto con columnas: `Nombre`, `Cantidad de usos`, `Actualización`, `Estado`, `Acciones`.
- Búsqueda por nombre o descripción.
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
- Tecnología: nombre y descripción.
- Perfil: nombre, nivel de referencia y descripción.
- Perfil tecnológico: nombre y descripción.

**Regla de persistencia:** los catálogos BBVA no utilizan un campo funcional `Código`. No debe existir en formularios, contratos HTTP, dominio, repositorios ni columnas SQL. El identificador técnico es `Id` (UUID) y el nombre es la clave funcional visible.

Este patrón será reutilizable para nuevos catálogos sin crear dependencias en el shell global de BaseBFS.

## Patrón transversal — confirmaciones y acciones sensibles

- Las confirmaciones contextuales que permanecen como modal —por ejemplo activar/inactivar o transiciones breves— utilizan `ConfirmDialog`; no se crean modales aislados por pantalla ni se usa `window.confirm()`. La eliminación de entidades no usa modal: utiliza el modo `delete` del formulario CRUD unificado.
- `ConfirmDialog` se renderiza mediante portal sobre `document.body`, bloquea el scroll de fondo, soporta cierre con `Esc`, restaura el foco y expone semántica `alertdialog` accesible.
- El patrón visual mantiene una franja lateral con icono, título, explicación funcional, botón de cierre, `Cancelar` y una acción primaria explícita.
- Los tonos son semánticos: `danger` para eliminación/conversión irreversible, `warning` para inactivación, `success` para reactivación y `primary` para confirmaciones neutras.
- `ConfirmDialog` es la única fuente visual para las confirmaciones modales que sigan aplicando en Banco de talento, Colaboradores, Catálogos y Certificaciones.

## Identidad de persona — IS y fuente corporativa desacoplada

- En frontend el identificador `SofttekCode` se presenta al usuario como **IS**. El nombre técnico existente se conserva internamente para evitar una migración innecesaria de persistencia y contratos ya establecidos.
- Los formularios de Talent Bank y Colaboradores incluyen `Buscar IS` y consumen `/api/bbva/identity-directory/{is}` mediante ruta relativa.
- La fuente corporativa real todavía no está definida. El backend expone una capa anti-corrupción mediante `BbvaIdentityDirectoryProvider`, que deberá adaptarse a la fuente oficial cuando sea confirmada.
- Hasta configurar un provider, la API responde de forma explícita que la fuente no está configurada; no se simulan datos ni se inventa un catálogo externo.
- El contrato canónico permite hidratar, cuando estén disponibles, usuario corporativo, correo, nombre, apellidos, perfil, perfil tecnológico, tecnología actual, expertise y fecha de contratación.

## Catálogo de certificaciones — superficie operativa

- `Código` no forma parte del modelo funcional ni técnico del catálogo. No se captura, no se devuelve por API y no se persiste en `bbva.CertificationCatalog`.
- La tabla operativa muestra Certificación, Tipo, Tecnología/Certificadora, Estado y Acciones.
- El formulario no muestra `Grupo de requisito`, `Mínimo del grupo` ni `Perfiles aplicables`.
- La aplicabilidad se modela mediante configuración de niveles permitidos; no se mantienen relaciones ocultas por perfil que alteren artificialmente el conteo de usos.
- La auditoría referencia la certificación mediante `CertificationId`; no replica un código textual.

## Integridad — Cantidad de usos

- `Cantidad de usos` representa referencias de dominio reales al registro del catálogo.
- Para `Perfiles`, se cuentan personas que referencian el perfil por FK y, de forma transitoria, registros históricos por nombre únicamente cuando no existe FK asociada.
- Para `Perfiles tecnológicos`, se aplica el mismo criterio sobre personas.
- Para `Tecnologías`, además de personas, se cuentan certificaciones que referencian realmente la tecnología mediante `TechnologyId`.
- Configuraciones auxiliares eliminadas de la superficie funcional no deben inflar `Cantidad de usos` ni bloquear un borrado con un uso inexistente para el usuario.
- El borrado continúa bloqueado con `409 Conflict` únicamente cuando existe una referencia real que debe conservarse.

## Patrón transversal — selectores con búsqueda

- Todo selector visible del sistema utiliza el componente compartido `SearchableSelect`; no se utilizan `<select>` nativos en nuevas superficies.
- El control cerrado muestra únicamente valor/placeholder y chevron. **No lleva icono de lupa.**
- La lupa se reserva a campos cuya acción semántica es una búsqueda explícita, por ejemplo el lookup de **IS**.
- Cuando un selector se abre, puede ofrecer búsqueda textual dentro del panel para listas largas, sin superponer iconos sobre el placeholder.
- El mismo patrón se utiliza en formularios, filtros, controles de paginación y selectores del shell cuando aplique.

## Patrón transversal — fechas y calendarios

- No se utilizan inputs nativos `type="date"` en las superficies BBVA.
- Las fechas utilizan el componente compartido `DatePicker` de `src/components/common/`, construido sobre `react-day-picker` y localizado en español. `BBVADatePicker` es únicamente un alias de compatibilidad dentro del módulo.
- Debe permitir navegación clara por día, semana, mes y año, incluyendo selección rápida de mes/año, semana iniciando en lunes, acceso a hoy y limpieza cuando el campo sea opcional.
- El contrato de datos conserva ISO `YYYY-MM-DD`; el usuario visualiza fechas en formato local `dd/mm/aaaa`.
- El componente debe ser reutilizado por cualquier módulo presente o futuro que capture fechas.

## Patrón transversal — idioma y microcopy

- Toda la interfaz visible se presenta en español, salvo el nombre de producto **BBVA Workspace**, que se conserva exactamente así.
- Nombres técnicos de productos/proveedores (SQL Server, Azure OpenAI, bfs_US, etc.) no se traducen cuando son nombres propios.
- No se incorporan frases promocionales, auto-descripciones del diseño ni mensajes como “experiencia moderna”, “inteligente”, “futurista” o similares dentro de pantallas operativas.
- El microcopy debe ser funcional, breve y orientado a la tarea: indicar qué capturar, qué ocurrirá o cómo corregir un error.
- Todos los archivos fuente y scripts SQL deben mantenerse en UTF-8; los textos con acentos se almacenan en SQL Server como `NVARCHAR`/literales `N'...'` para evitar caracteres `?` o mojibake.


## Patrón transversal — CRUD unificado por formulario

Toda entidad administrativa u operativa que exponga operaciones `Ver`, `Editar` y `Eliminar` debe reutilizar **el mismo componente de formulario y la misma distribución de campos**. No se crean vistas de detalle paralelas con tablas de pares etiqueta/valor ni pantallas de eliminación con otro layout.

El contrato visual y funcional es:

- `create`: campos habilitados; acciones `Cancelar` + acción primaria de alta.
- `edit`: mismos campos habilitados; acciones `Cancelar` + `Guardar cambios`.
- `view`: mismos campos visibles pero bloqueados; **única acción `Regresar`**, siempre ubicada en la parte superior izquierda de la página, fuera del formulario.
- `delete`: mismos campos visibles pero bloqueados; `Regresar` siempre se ubica en la parte superior izquierda de la página y `Eliminar` permanece como única acción inferior, alineada a la derecha. La eliminación se ejecuta únicamente desde esta ruta/pantalla.
- El menú `Acciones` de los listados navega a rutas explícitas `/:id`, `/:id/edit` y `/:id/delete`.
- Las dependencias, permisos e integridad se vuelven a validar en backend al confirmar `Eliminar`; si existe una dependencia real, se conserva el `409 Conflict` funcional.
- Los formularios compartidos reciben un `mode` tipado; la lógica de acciones inferiores vive en `BBVAFormActions` y el regreso superior reutiliza `BBVAFormBackButton` para evitar divergencias entre módulos.
- Regla transversal: cualquier acción visible denominada `Regresar` debe colocarse siempre en la parte superior izquierda de la vista. Nunca se coloca `Regresar` en el pie del formulario, modal o barra inferior.
- Las rutas de eliminación aparecen como `Eliminar` en breadcrumbs.
- Esta regla aplica a Banco de talento, Colaboradores, Categorías, Tecnologías, Perfiles, Perfiles tecnológicos y Certificaciones, y es obligatoria para cualquier CRUD futuro de BBVA Workspace.
- Las acciones ajenas al CRUD base (por ejemplo convertir talento, gestionar certificaciones o importar) pueden conservar flujos específicos, pero no deben alterar este contrato para Ver/Editar/Eliminar.

## Patrón funcional — ciclo de vida de la persona

Banco de talento y Colaboradores representan estados operativos de una misma persona; no son identidades independientes.

- `bbva.Person` es la identidad única. Las transiciones reutilizan el mismo `PersonId` y, por tanto, conservan IS, correo, datos profesionales, observaciones y documentos asociados.
- El CV permanece en `bbva.PersonDocument`; una transición entre Banco de talento y Colaboradores no crea una copia ni elimina el documento.
- Banco de talento → Colaboradores reutiliza o reactiva el registro de `bbva.Collaborator` de la persona y marca la entrada de Banco de talento como convertida.
- Colaboradores → Banco de talento inactiva al colaborador y crea o reactiva su misma `bbva.TalentBankEntry` como `BBVA_EXIT`, sin crear otra persona.
- La lista de Colaboradores representa únicamente colaboradores activos. Una persona movida a Banco de talento deja de aparecer en ese listado, pero su registro histórico se conserva.
- Los motivos de salida/retorno no se hardcodean en frontend: provienen de `bbva.LifecycleReasonCatalog`.
- Toda transición se registra en `bbva.PersonLifecycleHistory` con estado origen/destino, motivo, fecha efectiva, observaciones y actor.
- El historial 360 de la persona integra el historial de ciclo de vida con actividad previa de Banco de talento y Colaboradores.
- Una persona con transiciones de ciclo de vida no puede eliminarse físicamente desde los CRUD. Debe utilizarse la transición funcional correspondiente.

### Gestionar no es Editar

- `Editar` modifica datos maestros de la ficha utilizando el formulario CRUD unificado.
- `Gestionar` es el cockpit operativo del colaborador: muestra su contexto actual, accesos a edición/certificaciones, la acción `Mover a Banco de talento`, CV disponible, observaciones e historial de la persona.
- `Regresar` permanece siempre en la esquina superior izquierda también en vistas de gestión y transición.
- La conversión Banco de talento → Colaboradores finaliza en la vista `Gestionar` del colaborador para continuar el flujo operativo.

## Patrón funcional — vencimiento pertenece a certificaciones, no a personas

- La ficha maestra de una persona no contiene un campo funcional `Vencimiento`.
- `bbva.Collaborator.EndDate` y `bbva.TalentBankEntry.PlatformEndDate` se eliminan del modelo, contratos HTTP, formularios, vistas y persistencia.
- Colaboradores, Banco de talento y Prospectos no calculan ni muestran un vencimiento genérico de persona.
- Las fechas de expiración pertenecen a `bbva.PersonCertification`, donde su significado es explícitamente el vencimiento de una certificación concreta.
- Las transiciones de ciclo de vida registran su fecha efectiva en `bbva.PersonLifecycleHistory`; no reutilizan un campo de vencimiento de persona.

## Patrón funcional — certificaciones del colaborador

- Las certificaciones se asocian a `bbva.Person`, no al registro temporal de Colaborador; por ello sobreviven a las transiciones Banco de talento ↔ Colaborador.
- `bbva.PersonCertification` representa la certificación asignada/aplicable de la persona, su ciclo vigente, obligatoriedad, fechas y estado base.
- `bbva.PersonCertificationAttempt` registra intentos de manera append-only con número de intento, ciclo, resultado, fechas, costo capturado desde la configuración vigente y observaciones.
- `bbva.PersonCertificationHistory` mantiene trazabilidad funcional de asignación, actualización, intento, aprobación/reprobación, recertificación y `No aplica`.
- La aplicabilidad automática se deriva de configuración persistida del catálogo, tecnología actual y nivel de referencia del perfil; no se hardcodean reglas por colaborador en frontend.
- Los estados operativos se derivan de configuración y fechas: Pendiente, Programada, Aplicada, Reprobada, Vigente, Próxima a vencer, Vencida, Recertificación pendiente y No aplica.
- `Recertificar` inicia un nuevo ciclo sin borrar intentos ni historial previos.
- Una certificación asignada/histórica impide la eliminación física de su catálogo; debe conservarse la integridad referencial.
- La vista `Colaboradores > Certificaciones` es la superficie E2E de seguimiento de una persona; `Gestionar colaborador` presenta un resumen y acceso directo, pero no duplica la lógica de certificación.
- `Certificaciones > Seguimiento` ofrece la vista transversal para localizar colaboradores que requieren atención.

## Patrón funcional — Panel ejecutivo BBVA Workspace

- `/bbva/dashboard` es un panel operativo de solo lectura; no incluye personalización ni configuración de widgets.
- Las métricas se calculan desde persistencia real de Colaboradores, Banco de talento y certificaciones; no se muestran datos mock ni valores estáticos de negocio.
- Los filtros disponibles se aplican de forma consistente a las métricas y vistas: búsqueda, perfil, tecnología, estado de certificación y rango de fechas cuando corresponda.
- El panel prioriza alta legibilidad y drill-down: tarjetas, distribución por estado, vencimientos de certificaciones, capacidad por tecnología, composición de Banco de talento y una tabla de atención requerida.
- Las tarjetas y elementos interactivos navegan a la superficie operativa correspondiente en lugar de abrir configuradores de dashboard.
- El panel no introduce el concepto de Organización ni multitenancy dentro de BBVA Workspace.
- Las gráficas simples se implementan con componentes web ligeros y accesibles; una librería externa de gráficas solo se incorpora cuando exista una necesidad funcional que justifique su peso y mantenimiento.

## Patrón funcional — importación Excel de colaboradores

- La importación vive dentro de `Colaboradores`; no se crea un módulo paralelo ni un historial visible separado.
- Se procesa **siempre la primera hoja** del archivo `.xlsx`, sin depender de su nombre.
- Los encabezados se resuelven por nombre normalizado; el orden de columnas puede cambiar y las columnas adicionales no bloquean la carga.
- Una fila solo entra al análisis cuando contiene `NOMBRE EXTERNO`. Las filas sin nombre se ignoran y se informan en el resumen.
- La importación es repetible e idempotente: el mismo archivo puede cargarse cuantas veces sea necesario y no existe bloqueo por hash/recibo de archivo.
- La vista previa es obligatoria. Antes de aplicar se clasifican `Nuevos`, `Con cambios`, `Posibles bajas`, `Conflictos`, `Errores` y `Resueltos previamente`; no existe pestaña `Sin cambios`.
- Los cambios comparan `Campo`, `Valor actual` y `Valor del Excel`. El usuario puede aplicar el valor del Excel o mantener el actual, individualmente o por colaborador.
- Las decisiones de diferencias se guardan en `bbva.CollaboratorImportResolution` y se reutilizan cuando vuelve a aparecer exactamente el mismo conflicto de valores.
- Los posibles bajas requieren decisión explícita: `Desactivar`, `Mantener activo`, `Ignorar` o `Revisar manualmente`. `Desactivar` utiliza el ciclo de vida existente y mueve a la persona a Banco de talento; nunca elimina físicamente la persona.
- Los errores o conflictos de filas individuales no impiden aplicar registros válidos. La confirmación siempre indica qué se aplicará y qué se omitirá.
- Para colaboradores nuevos, si el Excel no contiene correo, este se captura manualmente en la vista previa y debe ser válido antes de aplicar.
- Perfil, perfil tecnológico y tecnología se normalizan para comparación. Cuando un valor del Excel no existe en su catálogo activo, la importación lo crea como registro activo en el catálogo correspondiente antes de asociarlo.
- Después de crear, actualizar o reactivar un colaborador se sincronizan sus certificaciones aplicables con las reglas persistidas del catálogo.
- La carga no modifica componentes globales de BaseBFS; su UX y sus selectores permanecen encapsulados dentro de BBVA Workspace.
- No se incorporan mensajes promocionales ni encabezados redundantes: breadcrumb, botón `Regresar`, carga, resumen, resolución y confirmación son suficientes para orientar el flujo.
