SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    THROW 51000, N'No existe el schema bbva.', 1;

  IF OBJECT_ID(N'bbva.Collaborator', N'U') IS NULL
    THROW 51000, N'No existe bbva.Collaborator.', 1;

  /*
    SQL Server puede compilar referencias a columnas nuevas antes de ejecutar
    un ALTER TABLE del mismo batch. Por eso tanto el ADD como el CREATE INDEX
    se ejecutan dinámicamente y se valida el resultado antes de continuar.
  */
  IF COL_LENGTH(N'bbva.Collaborator', N'DeliveryManager') IS NULL
  BEGIN
    EXEC sys.sp_executesql N'
      ALTER TABLE bbva.Collaborator
      ADD DeliveryManager NVARCHAR(180) NULL;
    ';
  END;

  IF COL_LENGTH(N'bbva.Collaborator', N'DeliveryManager') IS NULL
    THROW 51000, N'No fue posible crear bbva.Collaborator.DeliveryManager.', 1;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'bbva.Collaborator')
      AND name = N'IX_BBVA_Collaborator_DeliveryManager_Status'
  )
  BEGIN
    EXEC sys.sp_executesql N'
      CREATE INDEX IX_BBVA_Collaborator_DeliveryManager_Status
      ON bbva.Collaborator(DeliveryManager, Status)
      INCLUDE(PersonId, StartDate, UpdatedAt);
    ';
  END;

  COMMIT TRANSACTION;

  PRINT N'Migración V12 de DM, identidad de importación y dashboard aplicada correctamente.';
  SELECT
    CASE WHEN COL_LENGTH(N'bbva.Collaborator', N'DeliveryManager') IS NOT NULL THEN 1 ELSE 0 END AS DeliveryManagerReady,
    CASE WHEN EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE object_id = OBJECT_ID(N'bbva.Collaborator')
        AND name = N'IX_BBVA_Collaborator_DeliveryManager_Status'
    ) THEN 1 ELSE 0 END AS DeliveryManagerIndexReady;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
