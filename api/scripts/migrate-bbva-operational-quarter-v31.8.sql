SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF SCHEMA_ID(N'bbva') IS NULL EXEC(N'CREATE SCHEMA bbva');
IF OBJECT_ID(N'bbva.OperationalQuarterConfig',N'U') IS NULL
BEGIN
  CREATE TABLE bbva.OperationalQuarterConfig(
    QuarterCode NVARCHAR(16) NOT NULL CONSTRAINT PK_OperationalQuarterConfig PRIMARY KEY,
    OperationalStartDate DATE NOT NULL,
    OperationalEndDate DATE NOT NULL,
    UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_OperationalQuarterConfig_UpdatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedByEmail NVARCHAR(255) NULL,
    CONSTRAINT CK_OperationalQuarterConfig_Range CHECK(OperationalStartDate<=OperationalEndDate)
  );
END;
COMMIT TRANSACTION;
