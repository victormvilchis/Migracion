SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    THROW 51000, 'El esquema bbva no existe. Ejecute primero los scripts base de BBVA Workspace.', 1;

  IF OBJECT_ID(N'bbva.CollaboratorImportResolution', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CollaboratorImportResolution (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CollaboratorImportResolution PRIMARY KEY DEFAULT NEWID(),
      ResolutionKey NVARCHAR(96) NOT NULL,
      Decision NVARCHAR(24) NOT NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CollaboratorImportResolution_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CollaboratorImportResolution_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT CK_BBVA_CollaboratorImportResolution_Decision CHECK (Decision IN (N'APPLY_EXCEL',N'KEEP_CURRENT'))
    );
  END;

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name=N'UX_BBVA_CollaboratorImportResolution_Key'
      AND object_id=OBJECT_ID(N'bbva.CollaboratorImportResolution')
  )
    CREATE UNIQUE INDEX UX_BBVA_CollaboratorImportResolution_Key
      ON bbva.CollaboratorImportResolution(ResolutionKey);

  COMMIT TRANSACTION;
  PRINT N'Importación Excel de colaboradores BBVA configurada correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
