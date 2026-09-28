SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID(N'bbva.DashboardMetricSnapshot', N'U') IS NULL
    THROW 51000, N'No existe bbva.DashboardMetricSnapshot. Ejecuta primero el checkpoint V19.', 1;

  -- SQL Server compila las referencias de columnas del batch antes de ejecutar ALTER TABLE.
  -- Crear y consumir QuarterCode mediante SQL dinámico evita el mismo problema ya resuelto
  -- anteriormente con columnas agregadas en caliente.
  IF COL_LENGTH(N'bbva.DashboardMetricSnapshot', N'QuarterCode') IS NULL
  BEGIN
    EXEC sys.sp_executesql N'
      ALTER TABLE bbva.DashboardMetricSnapshot
      ADD QuarterCode NVARCHAR(16) NULL;
    ';
    EXEC sys.sp_executesql N'
      UPDATE bbva.DashboardMetricSnapshot
      SET QuarterCode=N''GLOBAL''
      WHERE QuarterCode IS NULL;
    ';
    EXEC sys.sp_executesql N'
      ALTER TABLE bbva.DashboardMetricSnapshot
      ALTER COLUMN QuarterCode NVARCHAR(16) NOT NULL;
    ';
  END;

  DECLARE @pkName SYSNAME;
  SELECT @pkName = kc.name
  FROM sys.key_constraints kc
  WHERE kc.parent_object_id=OBJECT_ID(N'bbva.DashboardMetricSnapshot')
    AND kc.[type]=N'PK';

  IF @pkName IS NOT NULL
  BEGIN
    DECLARE @pkColumns INT = (
      SELECT COUNT(1)
      FROM sys.index_columns ic
      INNER JOIN sys.indexes i ON i.object_id=ic.object_id AND i.index_id=ic.index_id
      WHERE i.object_id=OBJECT_ID(N'bbva.DashboardMetricSnapshot')
        AND i.is_primary_key=1
    );
    DECLARE @hasQuarterInPk BIT = CASE WHEN EXISTS (
      SELECT 1
      FROM sys.index_columns ic
      INNER JOIN sys.indexes i ON i.object_id=ic.object_id AND i.index_id=ic.index_id
      INNER JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
      WHERE i.object_id=OBJECT_ID(N'bbva.DashboardMetricSnapshot')
        AND i.is_primary_key=1
        AND c.name=N'QuarterCode'
    ) THEN 1 ELSE 0 END;

    IF @pkColumns <> 2 OR @hasQuarterInPk=0
      BEGIN
      DECLARE @dropPkSql NVARCHAR(MAX);
      SET @dropPkSql = N'ALTER TABLE bbva.DashboardMetricSnapshot DROP CONSTRAINT ' + QUOTENAME(@pkName) + N';';
      EXEC sys.sp_executesql @dropPkSql;
    END;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'bbva.DashboardMetricSnapshot') AND is_primary_key=1
  )
    EXEC sys.sp_executesql N'
      ALTER TABLE bbva.DashboardMetricSnapshot
      ADD CONSTRAINT PK_BBVA_DashboardMetricSnapshot PRIMARY KEY (SnapshotDate,QuarterCode);
    ';

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'bbva.DashboardMetricSnapshot')
      AND name=N'IX_BBVA_DashboardMetricSnapshot_Quarter_Date'
  )
    EXEC sys.sp_executesql N'
      CREATE INDEX IX_BBVA_DashboardMetricSnapshot_Quarter_Date
      ON bbva.DashboardMetricSnapshot(QuarterCode,SnapshotDate DESC)
      INCLUDE (CoveragePercent,Expiring,Expired,Pending,VendorReadyPercent,VendorPending,VendorExitRequired,CapturedAt);
    ';

  COMMIT TRANSACTION;
  PRINT N'Quarter Experience V23: snapshots KPI segmentados por Q configurados.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
