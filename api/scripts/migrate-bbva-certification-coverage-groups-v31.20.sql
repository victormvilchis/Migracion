SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH(N'bbva.PersonCertification', N'CoverageGroupId') IS NULL
    THROW 51200, 'CoverageGroupId is required before V31.20.', 1;
  IF COL_LENGTH(N'bbva.PersonCertification', N'CoveragePriority') IS NULL
    THROW 51201, 'CoveragePriority is required before V31.20.', 1;

  IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name=N'CK_BBVA_PersonCertification_CoveragePriority'
      AND parent_object_id=OBJECT_ID(N'bbva.PersonCertification')
  )
    ALTER TABLE bbva.PersonCertification DROP CONSTRAINT CK_BBVA_PersonCertification_CoveragePriority;

  ALTER TABLE bbva.PersonCertification
    ADD CONSTRAINT CK_BBVA_PersonCertification_CoveragePriority CHECK (CoveragePriority BETWEEN 1 AND 255);

  /* Solo certificaciones tecnológicas pueden pertenecer a una cobertura múltiple. */
  UPDATE pc
  SET CoverageGroupId=NULL,CoveragePriority=1,UpdatedAt=SYSUTCDATETIME()
  FROM bbva.PersonCertification pc
  INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
  WHERE pc.CoverageGroupId IS NOT NULL AND cc.CertificationType<>N'TECHNOLOGICAL';

  /* Si al limpiar tipos no tecnológicos quedó un grupo con un solo miembro, deja de ser grupo. */
  ;WITH SingletonGroups AS (
    SELECT PersonId,CoverageGroupId
    FROM bbva.PersonCertification
    WHERE CoverageGroupId IS NOT NULL AND Applicable=1 AND BaseStatus<>N'NOT_APPLICABLE'
    GROUP BY PersonId,CoverageGroupId
    HAVING COUNT(1)<2
  )
  UPDATE pc
  SET CoverageGroupId=NULL,CoveragePriority=1,UpdatedAt=SYSUTCDATETIME()
  FROM bbva.PersonCertification pc
  INNER JOIN SingletonGroups sg ON sg.PersonId=pc.PersonId AND sg.CoverageGroupId=pc.CoverageGroupId;

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name=N'UX_BBVA_PersonCertification_CoverageSlot'
      AND object_id=OBJECT_ID(N'bbva.PersonCertification')
  )
    CREATE UNIQUE INDEX UX_BBVA_PersonCertification_CoverageSlot
      ON bbva.PersonCertification(PersonId,CoverageGroupId,CoveragePriority)
      WHERE CoverageGroupId IS NOT NULL;

  COMMIT TRANSACTION;
  PRINT N'Cobertura tecnológica V31.20 configurada para grupos ordenados de hasta 255 certificaciones.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
