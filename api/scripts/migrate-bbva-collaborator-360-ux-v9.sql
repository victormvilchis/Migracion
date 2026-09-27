SET NOCOUNT ON;
SET XACT_ABORT ON;

IF SCHEMA_ID(N'bbva') IS NULL
  THROW 50001, 'El schema bbva no existe.', 1;

IF OBJECT_ID(N'bbva.CertificationCatalog', N'U') IS NULL
  THROW 50002, 'No existe bbva.CertificationCatalog. Ejecuta primero las migraciones BBVA previas.', 1;
GO

/*
  V9 - Ficha 360 + UX operativo
  - Homologa Tiempo para completar a días.
  - Conserva columnas legacy de meses/costos/result date para compatibilidad histórica,
    pero dejan de formar parte del contrato funcional de BBVA Workspace.
*/
IF COL_LENGTH(N'bbva.CertificationCatalog', N'InitialCompletionDays') IS NULL
BEGIN
  ALTER TABLE bbva.CertificationCatalog ADD InitialCompletionDays INT NULL;
END;
GO

UPDATE bbva.CertificationCatalog
SET InitialCompletionDays = CASE
    WHEN InitialCompletionDays IS NOT NULL THEN InitialCompletionDays
    WHEN InitialCompletionMonths IS NOT NULL THEN InitialCompletionMonths * 30
    ELSE NULL
  END,
  UpdatedAt = SYSUTCDATETIME(),
  UpdatedByEmail = N'bbva-collaborator-360-v9@local'
WHERE InitialCompletionDays IS NULL
  AND InitialCompletionMonths IS NOT NULL;
GO

/* Reglas operativas vigentes expresadas en días. */
UPDATE bbva.CertificationCatalog
SET InitialCompletionDays=30, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=N'bbva-collaborator-360-v9@local'
WHERE CertificationType=N'TECHNOLOGICAL' AND ISNULL(InitialCompletionDays,0)<>30;

UPDATE bbva.CertificationCatalog
SET InitialCompletionDays=90, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=N'bbva-collaborator-360-v9@local'
WHERE CertificationType=N'DEVELOPMENT_SECURITY' AND ISNULL(InitialCompletionDays,0)<>90;

UPDATE bbva.CertificationCatalog
SET InitialCompletionDays=60, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=N'bbva-collaborator-360-v9@local'
WHERE CertificationType=N'NORMATIVE_TESTING' AND ISNULL(InitialCompletionDays,0)<>60;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE parent_object_id=OBJECT_ID(N'bbva.CertificationCatalog')
    AND name=N'CK_BBVA_CertificationCatalog_CompletionDays'
)
BEGIN
  ALTER TABLE bbva.CertificationCatalog WITH NOCHECK
    ADD CONSTRAINT CK_BBVA_CertificationCatalog_CompletionDays
    CHECK (InitialCompletionDays IS NULL OR InitialCompletionDays > 0);
END;
GO

PRINT N'BBVA V9 aplicada: Ficha 360 / UX operativo / tiempo para completar en días.';
