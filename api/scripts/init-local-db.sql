-- Script de inicialización para SQL Server local (Docker / Azure SQL compatible)
-- Ejecutar en SQL Server (por ejemplo, con sqlcmd, DBeaver, Azure Data Studio o SSMS)

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'bfs_local_db')
BEGIN
    CREATE DATABASE bfs_local_db;
END
GO

USE bfs_local_db;
GO

-- Tabla de ejemplo para la aplicación base
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SampleItems' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.SampleItems (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Title NVARCHAR(150) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Category NVARCHAR(50) NOT NULL DEFAULT 'General',
        Status NVARCHAR(30) NOT NULL DEFAULT 'Activo',
        CreatedByEmail NVARCHAR(255) NOT NULL DEFAULT 'developer@softtek.com',
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    -- Insertar registros semilla de prueba
    INSERT INTO dbo.SampleItems (Title, Description, Category, Status, CreatedByEmail)
    VALUES 
    (N'Configuración inicial de entorno', N'Verificar que Docker y Azure Functions estén corriendo en local.', N'DevOps', N'Completado', N'francisco.barrera@softtek.com'),
    (N'Integración con Azure OpenAI', N'Configurar credenciales en local.settings.json para habilitar el asistente de IA.', N'AI', N'Pendiente', N'developer@softtek.com'),
    (N'Desarrollo de nuevo módulo', N'Construir los componentes del frontend y las APIs correspondientes.', N'Frontend', N'En Progreso', N'developer@softtek.com');
END
GO
