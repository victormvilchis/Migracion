# BaseBFS Platform — Plantilla Base de Desarrollo

Bienvenido al repositorio **BaseBFS**, el proyecto base desacoplado y listo para desarrollo local para el vertical de Banking & Financial Services (BFS) de Softtek.

Este proyecto replica con exactitud la arquitectura, contratos de runtime, stack tecnológico y buenas prácticas de la plataforma principal (`bfs_US`), pero se encuentra completamente limpio de dependencias corporativas, datos sensibles o módulos preexistentes. Permite a cualquier equipo interno o externo construir nuevas aplicaciones o módulos con ejecución 100% local, y transferirlos posteriormente a producción en minutos.

---

## 🚀 Arquitectura y Servicios Locales

- **Frontend:** Single Page Application (SPA) con React 18, Vite, TypeScript y Tailwind CSS. Utiliza Zustand para estado global y TanStack React Query para fetching y caché.
- **Backend:** Azure Functions v4 en Node.js (TypeScript) con el modelo de programación moderno (`@azure/functions`).
- **Base de Datos Local:** SQL Server 2022 developer edition ejecutándose en Docker (`docker-compose.yml`), 100% compatible con Azure SQL.
- **Almacenamiento Local:** Azurite emulando Azure Blob Storage y Azure Queue Storage localmente.
- **Servicios de IA:** Conector para Azure OpenAI. Cada equipo puede colocar sus propias credenciales en `api/local.settings.json`. Si aún no cuentan con credenciales, incluye un **Modo Simulación (Mock Local)** activado por defecto para desarrollar sin bloqueos.
- **Autenticación Local:** Simulación de identidades (`src/devConfig.ts`) para trabajar sin requerir Azure Active Directory (Entra ID) en el entorno de desarrollo.

---

## 📋 Prerrequisitos

1. **Node.js**: Versión **22.x** (Recomendado v22.22.2 fijada en `.nvmrc`).
   ```bash
   nvm install 22.22.2
   nvm use 22.22.2
   ```
2. **Azure Functions Core Tools v4**:
   ```bash
   npm install -g azure-functions-core-tools@4 --unsafe-perm true
   ```
3. **Docker Desktop** (opcional pero recomendado para SQL Server local):
   Descargar e instalar desde [docker.com](https://www.docker.com/).

---

## ⚡ Inicio Rápido (4 Pasos)

### 1. Instalar dependencias
Ejecuta el script de instalación en la raíz:
```bash
npm run setup
```
*(Este comando valida Node 22 e instala tanto las dependencias del frontend como de la API).*

### 2. Levantar la Base de Datos Local
Inicia los contenedores de SQL Server y Azurite con Docker:
```bash
docker compose up -d
```
> **Nota de Resiliencia:** Si no dispones de Docker inmediatamente, la API incluye un almacenamiento de respaldo en memoria automático para que puedas probar la aplicación de inmediato.

### 3. Configurar Servicios de IA (Gateway OpenAI o Azure OpenAI)
Revisa el archivo `api/local.settings.json`:
- Por defecto, `AI_MOCK_MODE` está en `"true"` (simula respuestas de IA localmente sin consumir saldo).
- **Opción A (Gateway OpenAI Compatible - LiteLLM, Azure APIM, Cloudflare, Portkey, Kong):**
  - `OPENAI_BASE_URL`: URL base de tu gateway (ej. `https://mi-gateway.empresa.com/v1` o `http://localhost:4000/v1`).
  - `OPENAI_API_KEY`: API Key del gateway.
  - `OPENAI_MODEL`: Modelo a invocar (ej. `gpt-4o`, `claude-3-5-sonnet`, etc.).
  - `AI_GATEWAY_CUSTOM_HEADERS`: JSON con headers adicionales opcionales (ej. `{"X-Tenant-Id":"bfs"}`).
  - Cambia `AI_MOCK_MODE` a `"false"`.
- **Opción B (Azure OpenAI Nativo):**
  - `AZURE_OPENAI_ENDPOINT`: Endpoint de Azure OpenAI.
  - `AZURE_OPENAI_KEY`: API Key de Azure.
  - `AZURE_OPENAI_DEPLOYMENT_NAME`: Nombre del deployment (ej. `gpt-4o`).
  - Cambia `AI_MOCK_MODE` a `"false"`.

### 4. Iniciar la Aplicación en Local
Ejecuta el runner automático:
- **En Mac / Linux:**
  ```bash
  ./start.sh
  ```
- **En Windows (PowerShell):**
  ```powershell
  .\start.ps1
  ```
- **En Windows (CMD):**
  ```cmd
  start.bat
  ```

Los servidores iniciarán en:
- **Frontend (React/Vite):** `http://localhost:5173`
- **Backend (Azure Functions):** `http://localhost:7071`
- Las llamadas desde el frontend dirigidas a `/api/*` son redirigidas automáticamente al backend en el puerto 7071.

---

## 📂 Estructura del Proyecto

```text
BaseBFS/
├── docker-compose.yml              # SQL Server 2022 y Azurite local
├── package.json                    # Dependencias y scripts Frontend
├── vite.config.ts                  # Vite con alias '@' y proxy '/api'
├── tailwind.config.js              # Configuración de diseño Softtek BFS
├── start.sh / start.bat            # Ejecución en paralelo
├── GUIA_INTEGRACION_BFS_US.md      # Manual para traspasar tu módulo a producción
├── src/                            # Código del Frontend
│   ├── devConfig.ts                # Gestión de usuarios simulados locales
│   ├── lib/
│   │   ├── api.ts                  # Cliente fetch preconfigurado
│   │   └── utils.ts                # Utilidades de Tailwind
│   ├── components/                 # Componentes visuales y layout
│   └── pages/                      # Páginas de la aplicación
│       ├── DashboardPage.tsx       # Estado del sistema y bienvenida
│       ├── SampleCrudPage.tsx      # CRUD funcional con SQL Server
│       └── SampleAiPage.tsx        # Chat interactivo con Azure OpenAI / Mock
└── api/                            # Backend Serverless (Azure Functions)
    ├── package.json                # Dependencias backend (@azure/functions, mssql, openai)
    ├── bootstrap.js                # Cargador dinámico de funciones
    ├── host.json                   # Configuración del runtime de Azure Functions
    ├── local.settings.json         # Variables de entorno locales (git-ignored)
    ├── scripts/
    │   └── init-local-db.sql       # Script para crear tablas en SQL Server local
    └── src/
        ├── lib/
        │   ├── db.ts               # Pool de conexiones SQL con reconexión
        │   ├── azureOpenAiService.ts# Servicio Azure OpenAI con fallback mock
        │   └── authzLocal.ts       # Extracción de usuario y roles locales
        └── functions/              # Endpoints HTTP (app.http)
            ├── health.ts           # GET /api/health
            ├── sampleItems.ts      # GET / POST / DELETE /api/items
            └── sampleAiChat.ts     # POST /api/ai/chat
```

---

## 📦 Cómo Construir Nuevas Funcionalidades y Pasarlas a Producción

Para mantener una compatibilidad del 100% y poder transferir tu trabajo al proyecto principal `bfs_US` en minutos, consulta:
👉 **[GUIA_INTEGRACION_BFS_US.md](./GUIA_INTEGRACION_BFS_US.md)**

---

*Desarrollado para el vertical de Banking & Financial Services (BFS) — Softtek.*
