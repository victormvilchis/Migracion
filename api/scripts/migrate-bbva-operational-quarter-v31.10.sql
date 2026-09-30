SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF SCHEMA_ID(N'bbva') IS NULL EXEC(N'CREATE SCHEMA bbva');

IF OBJECT_ID(N'bbva.OperationalQuarterConfig',N'U') IS NULL
BEGIN
  CREATE TABLE bbva.OperationalQuarterConfig(
    QuarterCode NVARCHAR(16) NOT NULL CONSTRAINT PK_OperationalQuarterConfig PRIMARY KEY,
    SourceStartDate DATE NULL,
    SourceEndDate DATE NULL,
    SourceConfigured BIT NOT NULL CONSTRAINT DF_OperationalQuarterConfig_SourceConfigured DEFAULT(0),
    OperationalStartDate DATE NOT NULL,
    OperationalEndDate DATE NOT NULL,
    UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_OperationalQuarterConfig_UpdatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedByEmail NVARCHAR(255) NULL,
    CONSTRAINT CK_OperationalQuarterConfig_Range CHECK(OperationalStartDate<=OperationalEndDate)
  );
END
ELSE
BEGIN
  IF COL_LENGTH(N'bbva.OperationalQuarterConfig',N'SourceStartDate') IS NULL ALTER TABLE bbva.OperationalQuarterConfig ADD SourceStartDate DATE NULL;
  IF COL_LENGTH(N'bbva.OperationalQuarterConfig',N'SourceEndDate') IS NULL ALTER TABLE bbva.OperationalQuarterConfig ADD SourceEndDate DATE NULL;
  IF COL_LENGTH(N'bbva.OperationalQuarterConfig',N'SourceConfigured') IS NULL ALTER TABLE bbva.OperationalQuarterConfig ADD SourceConfigured BIT NOT NULL CONSTRAINT DF_OperationalQuarterConfig_SourceConfigured DEFAULT(0);
END;

/* La ventana operativa se materializa desde Vendors: nunca es una segunda fuente de verdad. */
UPDATE bbva.OperationalQuarterConfig
SET OperationalStartDate = CASE WHEN DAY(SourceStartDate)=1 THEN SourceStartDate ELSE DATEADD(DAY,1,EOMONTH(SourceStartDate)) END,
    OperationalEndDate = EOMONTH(SourceEndDate),
    UpdatedAt = SYSUTCDATETIME()
WHERE SourceStartDate IS NOT NULL AND SourceEndDate IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_OperationalQuarterConfig_SourcePair')
  ALTER TABLE bbva.OperationalQuarterConfig WITH CHECK ADD CONSTRAINT CK_OperationalQuarterConfig_SourcePair
  CHECK ((SourceStartDate IS NULL AND SourceEndDate IS NULL) OR (SourceStartDate IS NOT NULL AND SourceEndDate IS NOT NULL));

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_OperationalQuarterConfig_SourceRange')
  ALTER TABLE bbva.OperationalQuarterConfig WITH CHECK ADD CONSTRAINT CK_OperationalQuarterConfig_SourceRange
  CHECK (SourceStartDate IS NULL OR SourceEndDate IS NULL OR SourceStartDate<=SourceEndDate);

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_OperationalQuarterConfig_SourceConfigured')
  ALTER TABLE bbva.OperationalQuarterConfig WITH CHECK ADD CONSTRAINT CK_OperationalQuarterConfig_SourceConfigured
  CHECK (SourceConfigured=0 OR (SourceStartDate IS NOT NULL AND SourceEndDate IS NOT NULL));

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_OperationalQuarterConfig_DerivedWindow')
  ALTER TABLE bbva.OperationalQuarterConfig WITH CHECK ADD CONSTRAINT CK_OperationalQuarterConfig_DerivedWindow
  CHECK (
    SourceStartDate IS NULL OR SourceEndDate IS NULL OR
    (
      OperationalStartDate = CASE WHEN DAY(SourceStartDate)=1 THEN SourceStartDate ELSE DATEADD(DAY,1,EOMONTH(SourceStartDate)) END
      AND OperationalEndDate = EOMONTH(SourceEndDate)
    )
  );

COMMIT TRANSACTION;
