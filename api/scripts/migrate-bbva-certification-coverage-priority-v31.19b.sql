SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  /*
    SQL Server resolves column references for a static batch before the ALTER TABLE
    statements execute. Keep every statement that references the new columns in
    dynamic SQL so a clean database can add and then use them in the same migration.
  */
  IF COL_LENGTH(N'bbva.PersonCertification', N'CoverageGroupId') IS NULL
    EXEC(N'ALTER TABLE bbva.PersonCertification ADD CoverageGroupId UNIQUEIDENTIFIER NULL;');

  IF COL_LENGTH(N'bbva.PersonCertification', N'CoveragePriority') IS NULL
    EXEC(N'ALTER TABLE bbva.PersonCertification ADD CoveragePriority TINYINT NOT NULL CONSTRAINT DF_BBVA_PersonCertification_CoveragePriority DEFAULT (1) WITH VALUES;');

  IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_BBVA_PersonCertification_CoveragePriority'
      AND parent_object_id = OBJECT_ID(N'bbva.PersonCertification')
  )
    EXEC(N'ALTER TABLE bbva.PersonCertification ADD CONSTRAINT CK_BBVA_PersonCertification_CoveragePriority CHECK (CoveragePriority IN (1,2,3));');

  EXEC(N'UPDATE bbva.PersonCertification
         SET CoveragePriority = 1
         WHERE CoveragePriority IS NULL OR CoveragePriority NOT IN (1,2,3);');

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_BBVA_PersonCertification_Coverage'
      AND object_id = OBJECT_ID(N'bbva.PersonCertification')
  )
    EXEC(N'CREATE INDEX IX_BBVA_PersonCertification_Coverage
           ON bbva.PersonCertification(PersonId, CoverageGroupId, CoveragePriority)
           INCLUDE (Applicable, BaseStatus, ExpirationDate, CertificationId);');

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_BBVA_PersonCertification_CoverageSlot'
      AND object_id = OBJECT_ID(N'bbva.PersonCertification')
  )
    EXEC(N'CREATE UNIQUE INDEX UX_BBVA_PersonCertification_CoverageSlot
           ON bbva.PersonCertification(PersonId, CoverageGroupId, CoveragePriority)
           WHERE CoverageGroupId IS NOT NULL;');

  IF COL_LENGTH(N'bbva.PersonCertification', N'CoverageGroupId') IS NULL
    THROW 51001, 'CoverageGroupId was not created.', 1;

  IF COL_LENGTH(N'bbva.PersonCertification', N'CoveragePriority') IS NULL
    THROW 51002, 'CoveragePriority was not created.', 1;

  COMMIT TRANSACTION;
  PRINT N'Prioridad de cobertura de certificaciones V31.19b configurada correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
