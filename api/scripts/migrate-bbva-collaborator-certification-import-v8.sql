SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    THROW 51000, 'El esquema bbva no existe. Ejecuta primero los scripts BBVA base.', 1;

  IF OBJECT_ID(N'bbva.CertificationCatalog', N'U') IS NULL
    THROW 51000, 'No existe bbva.CertificationCatalog. Ejecuta primero init-bbva-certification-catalog.sql.', 1;

  IF OBJECT_ID(N'bbva.PersonCertification', N'U') IS NULL
    THROW 51000, 'No existe bbva.PersonCertification. Ejecuta primero las migraciones de certificaciones.', 1;

  IF OBJECT_ID(N'bbva.PersonCertificationAttempt', N'U') IS NULL
    THROW 51000, 'No existe bbva.PersonCertificationAttempt. Ejecuta primero las migraciones de certificaciones.', 1;

  IF OBJECT_ID(N'bbva.PersonCertificationHistory', N'U') IS NULL
    THROW 51000, 'No existe bbva.PersonCertificationHistory. Ejecuta primero las migraciones de certificaciones.', 1;

  IF OBJECT_ID(N'bbva.CertificationAllowedLevel', N'U') IS NULL
    THROW 51000, 'No existe bbva.CertificationAllowedLevel. Ejecuta primero init-bbva-certification-catalog.sql.', 1;

  /* Reglas de plazo inicial expresamente definidas para el tablero histórico. */
  UPDATE bbva.CertificationCatalog
  SET InitialCompletionMonths=1, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=N'bbva-certification-import-v8@local'
  WHERE CertificationType=N'TECHNOLOGICAL' AND ISNULL(InitialCompletionMonths,0)<>1;

  UPDATE bbva.CertificationCatalog
  SET InitialCompletionMonths=3, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=N'bbva-certification-import-v8@local'
  WHERE CertificationType=N'DEVELOPMENT_SECURITY' AND ISNULL(InitialCompletionMonths,0)<>3;

  /* El umbral ExpiringSoonDays NO se infiere del Excel. Se conserva la configuración existente. */

  DECLARE @Actor NVARCHAR(255)=N'bbva-certification-import-v8@local';
  DECLARE @Generic TABLE (
    Name NVARCHAR(180), CertificationType NVARCHAR(40), ValidityMonths INT NULL,
    CompletionMonths INT NULL, Recert BIT, Attempts BIT, ApplicationDate BIT,
    Mandatory BIT, Description NVARCHAR(1000)
  );

  INSERT INTO @Generic VALUES
    (N'NORMATIVA & TESTING',N'NORMATIVE_TESTING',12,2,1,1,1,1,N'Certificación normativa y testing con recertificación anual.'),
    (N'ONE',N'COMPLIANCE',NULL,NULL,0,0,0,0,N'Estado de cumplimiento ONE; sin vencimiento ni intentos automáticos.'),
    (N'AGILE',N'METHODOLOGICAL',NULL,NULL,0,0,0,0,N'Estado de formación/certificación Agile del tablero operativo; sin vencimiento automático.'),
    (N'JIRA',N'COMPLIANCE',NULL,NULL,0,0,0,0,N'Estado de formación JIRA del tablero operativo; sin vencimiento ni intentos.'),
    (N'GITHUB',N'COMPLIANCE',NULL,NULL,0,0,0,0,N'Estado GitHub del tablero operativo; sin reglas de vigencia no documentadas.');

  INSERT INTO bbva.CertificationCatalog (
    Name,Description,CertificationType,Provider,TechnologyId,ValidityMonths,InitialCompletionMonths,
    RecertificationEnabled,RequiresAttempts,RequiresApplicationDate,DefaultMandatory,
    RequirementGroup,RequirementGroupMinimum,Status,CreatedByEmail,UpdatedByEmail
  )
  SELECT g.Name,g.Description,g.CertificationType,NULL,NULL,g.ValidityMonths,g.CompletionMonths,
         g.Recert,g.Attempts,g.ApplicationDate,g.Mandatory,NULL,NULL,N'ACTIVE',@Actor,@Actor
  FROM @Generic g
  WHERE NOT EXISTS (SELECT 1 FROM bbva.CertificationCatalog c WHERE UPPER(c.Name)=UPPER(g.Name));

  INSERT INTO bbva.CertificationAllowedLevel (CertificationId,LevelCode)
  SELECT c.Id,N'GENERIC'
  FROM bbva.CertificationCatalog c
  INNER JOIN @Generic g ON UPPER(g.Name)=UPPER(c.Name)
  WHERE NOT EXISTS (
    SELECT 1 FROM bbva.CertificationAllowedLevel al
    WHERE al.CertificationId=c.Id AND al.LevelCode=N'GENERIC'
  );

  IF COL_LENGTH(N'bbva.PersonCertification', N'InitialDueDate') IS NULL
    ALTER TABLE bbva.PersonCertification ADD InitialDueDate DATE NULL;
  IF COL_LENGTH(N'bbva.PersonCertification', N'ImportedCertificationStatus') IS NULL
    ALTER TABLE bbva.PersonCertification ADD ImportedCertificationStatus NVARCHAR(80) NULL;
  IF COL_LENGTH(N'bbva.PersonCertification', N'ImportedExamStatus') IS NULL
    ALTER TABLE bbva.PersonCertification ADD ImportedExamStatus NVARCHAR(60) NULL;
  IF COL_LENGTH(N'bbva.PersonCertification', N'LastScore10') IS NULL
    ALTER TABLE bbva.PersonCertification ADD LastScore10 DECIMAL(5,2) NULL;
  IF COL_LENGTH(N'bbva.PersonCertification', N'ImportedAttemptNumber') IS NULL
    ALTER TABLE bbva.PersonCertification ADD ImportedAttemptNumber INT NULL;
  IF COL_LENGTH(N'bbva.PersonCertification', N'LastDataSource') IS NULL
    ALTER TABLE bbva.PersonCertification ADD LastDataSource NVARCHAR(16) NULL;
  IF COL_LENGTH(N'bbva.PersonCertification', N'LastImportFingerprint') IS NULL
    ALTER TABLE bbva.PersonCertification ADD LastImportFingerprint CHAR(64) NULL;
  IF COL_LENGTH(N'bbva.PersonCertification', N'LastImportedAt') IS NULL
    ALTER TABLE bbva.PersonCertification ADD LastImportedAt DATETIME2(3) NULL;

  /* SQL Server compila el batch completo antes de ejecutar los ALTER ADD anteriores.
     Las expresiones que referencian columnas recién creadas se ejecutan de forma dinámica
     para que la resolución de nombres ocurra después de que las columnas existan. */
  IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_BBVA_PersonCertification_Score10')
    EXEC(N'ALTER TABLE bbva.PersonCertification ADD CONSTRAINT CK_BBVA_PersonCertification_Score10 CHECK (LastScore10 IS NULL OR (LastScore10>=0 AND LastScore10<=10));');
  IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_BBVA_PersonCertification_ImportedAttempt')
    EXEC(N'ALTER TABLE bbva.PersonCertification ADD CONSTRAINT CK_BBVA_PersonCertification_ImportedAttempt CHECK (ImportedAttemptNumber IS NULL OR ImportedAttemptNumber>=0);');
  IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_BBVA_PersonCertification_LastDataSource')
    EXEC(N'ALTER TABLE bbva.PersonCertification ADD CONSTRAINT CK_BBVA_PersonCertification_LastDataSource CHECK (LastDataSource IS NULL OR LastDataSource IN (N''MANUAL'',N''IMPORT'',N''AUTO''));');

  IF OBJECT_ID(N'bbva.PersonCertificationAttempt', N'U') IS NOT NULL
  BEGIN
    IF COL_LENGTH(N'bbva.PersonCertificationAttempt', N'Score10') IS NULL
      ALTER TABLE bbva.PersonCertificationAttempt ADD Score10 DECIMAL(5,2) NULL;
    IF COL_LENGTH(N'bbva.PersonCertificationAttempt', N'Source') IS NULL
      ALTER TABLE bbva.PersonCertificationAttempt ADD Source NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_PersonCertificationAttempt_Source DEFAULT N'MANUAL';
    IF COL_LENGTH(N'bbva.PersonCertificationAttempt', N'ImportFingerprint') IS NULL
      ALTER TABLE bbva.PersonCertificationAttempt ADD ImportFingerprint CHAR(64) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_BBVA_PersonCertificationAttempt_Score10')
      EXEC(N'ALTER TABLE bbva.PersonCertificationAttempt ADD CONSTRAINT CK_BBVA_PersonCertificationAttempt_Score10 CHECK (Score10 IS NULL OR (Score10>=0 AND Score10<=10));');
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_BBVA_PersonCertificationAttempt_Source')
      EXEC(N'ALTER TABLE bbva.PersonCertificationAttempt ADD CONSTRAINT CK_BBVA_PersonCertificationAttempt_Source CHECK (Source IN (N''MANUAL'',N''IMPORT''));');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_PersonCertificationAttempt_ImportFingerprint' AND object_id=OBJECT_ID(N'bbva.PersonCertificationAttempt'))
      EXEC(N'CREATE UNIQUE INDEX UX_BBVA_PersonCertificationAttempt_ImportFingerprint ON bbva.PersonCertificationAttempt(PersonCertificationId,ImportFingerprint) WHERE ImportFingerprint IS NOT NULL;');
  END;

  IF OBJECT_ID(N'bbva.PersonCertificationHistory', N'U') IS NOT NULL
  BEGIN
    IF COL_LENGTH(N'bbva.PersonCertificationHistory', N'Source') IS NULL
      ALTER TABLE bbva.PersonCertificationHistory ADD Source NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_PersonCertificationHistory_Source DEFAULT N'MANUAL';
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_BBVA_PersonCertificationHistory_Source')
      EXEC(N'ALTER TABLE bbva.PersonCertificationHistory ADD CONSTRAINT CK_BBVA_PersonCertificationHistory_Source CHECK (Source IN (N''MANUAL'',N''IMPORT'',N''AUTO''));');
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_PersonCertification_ImportFingerprint' AND object_id=OBJECT_ID(N'bbva.PersonCertification'))
    EXEC(N'CREATE INDEX IX_BBVA_PersonCertification_ImportFingerprint ON bbva.PersonCertification(PersonId,LastImportFingerprint) INCLUDE (CertificationId,LastImportedAt,LastDataSource);');

  COMMIT TRANSACTION;
  PRINT N'Importación histórica de certificaciones v8 configurada correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
