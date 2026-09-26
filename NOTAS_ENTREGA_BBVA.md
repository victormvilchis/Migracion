# Notas de entrega — BBVA Talent Management

## Rutas frontend
- `/bbva/talent-bank`
- `/bbva/collaborators`

## Endpoints
- `/api/bbva/talent-bank`
- `/api/bbva/collaborators`

## Base de datos
El módulo utiliza exclusivamente el schema `bbva`.

Script para instalación limpia en Azure SQL / SQL Server:

`api/scripts/init-bbva-talent.sql`

El script `api/scripts/migrate-bbva-talent-local.sql` es únicamente para actualizar entornos locales creados antes de introducir el schema `bbva`; no forma parte de la entrega productiva.

## Variables de entorno
No se agregan nuevas variables de entorno. Se reutiliza `AZURE_SQL_CONNECTION_STRING`.

## Integración visual
El módulo contiene su propio `BBVALayout`, `BBVAHeader` y `BBVASidebar`. El proyecto host únicamente debe registrar las rutas BBVA.
