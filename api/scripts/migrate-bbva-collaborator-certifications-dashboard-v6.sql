SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    THROW 51000, 'El esquema bbva no existe. Ejecute primero los scripts base de BBVA Workspace.', 1;

  /* ----------------------------------------------------------------------
     Limpieza de modelo persona: el vencimiento pertenece a certificaciones,
     no a Colaboradores ni a Banco de talento.
     ---------------------------------------------------------------------- */
  IF OBJECT_ID(N'bbva.Collaborator', N'U') IS NOT NULL
  BEGIN
    IF COL_LENGTH(N'bbva.Collaborator', N'EndDate') IS NOT NULL
    BEGIN
      DECLARE @CollaboratorObjectId INT = OBJECT_ID(N'bbva.Collaborator');
      DECLARE @CollaboratorEndDateColumnId INT = COLUMNPROPERTY(@CollaboratorObjectId, N'EndDate', 'ColumnId');
      DECLARE @DropCollaboratorDependencies NVARCHAR(MAX) = N'';

      /* Check constraints: soporta nombres históricos y actuales sin asumir el nombre. */
      SELECT @DropCollaboratorDependencies = @DropCollaboratorDependencies
        + N'ALTER TABLE bbva.Collaborator DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';'
      FROM sys.check_constraints cc
      INNER JOIN sys.sql_expression_dependencies sed ON sed.referencing_id = cc.object_id
      WHERE cc.parent_object_id = @CollaboratorObjectId
        AND sed.referenced_id = @CollaboratorObjectId
        AND sed.referenced_minor_id = @CollaboratorEndDateColumnId;

      /* Default constraint si existiera en instalaciones previas. */
      SELECT @DropCollaboratorDependencies = @DropCollaboratorDependencies
        + N'ALTER TABLE bbva.Collaborator DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';'
      FROM sys.default_constraints dc
      WHERE dc.parent_object_id = @CollaboratorObjectId
        AND dc.parent_column_id = @CollaboratorEndDateColumnId;

      IF LEN(@DropCollaboratorDependencies) > 0
        EXEC sys.sp_executesql @DropCollaboratorDependencies;

      ALTER TABLE bbva.Collaborator DROP COLUMN EndDate;
    END;
  END;

  IF OBJECT_ID(N'bbva.TalentBankEntry', N'U') IS NOT NULL
  BEGIN
    IF COL_LENGTH(N'bbva.TalentBankEntry', N'PlatformEndDate') IS NOT NULL
    BEGIN
      DECLARE @TalentObjectId INT = OBJECT_ID(N'bbva.TalentBankEntry');
      DECLARE @TalentEndDateColumnId INT = COLUMNPROPERTY(@TalentObjectId, N'PlatformEndDate', 'ColumnId');
      DECLARE @DropTalentDependencies NVARCHAR(MAX) = N'';

      SELECT @DropTalentDependencies = @DropTalentDependencies
        + N'ALTER TABLE bbva.TalentBankEntry DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';'
      FROM sys.check_constraints cc
      INNER JOIN sys.sql_expression_dependencies sed ON sed.referencing_id = cc.object_id
      WHERE cc.parent_object_id = @TalentObjectId
        AND sed.referenced_id = @TalentObjectId
        AND sed.referenced_minor_id = @TalentEndDateColumnId;

      SELECT @DropTalentDependencies = @DropTalentDependencies
        + N'ALTER TABLE bbva.TalentBankEntry DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';'
      FROM sys.default_constraints dc
      WHERE dc.parent_object_id = @TalentObjectId
        AND dc.parent_column_id = @TalentEndDateColumnId;

      IF LEN(@DropTalentDependencies) > 0
        EXEC sys.sp_executesql @DropTalentDependencies;

      ALTER TABLE bbva.TalentBankEntry DROP COLUMN PlatformEndDate;
    END;
  END;

  /* ----------------------------------------------------------------------
     Certificaciones por persona. Se asocian a Person para conservarlas al
     mover una persona entre Banco de talento y Colaboradores.
     ---------------------------------------------------------------------- */
  IF OBJECT_ID(N'bbva.PersonCertification', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.PersonCertification (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_PersonCertification PRIMARY KEY DEFAULT NEWID(),
      PersonId UNIQUEIDENTIFIER NOT NULL,
      CertificationId UNIQUEIDENTIFIER NOT NULL,
      Applicable BIT NOT NULL CONSTRAINT DF_BBVA_PersonCertification_Applicable DEFAULT 1,
      Mandatory BIT NOT NULL CONSTRAINT DF_BBVA_PersonCertification_Mandatory DEFAULT 1,
      Source NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_PersonCertification_Source DEFAULT N'AUTO',
      CurrentCycle INT NOT NULL CONSTRAINT DF_BBVA_PersonCertification_CurrentCycle DEFAULT 1,
      BaseStatus NVARCHAR(24) NOT NULL CONSTRAINT DF_BBVA_PersonCertification_BaseStatus DEFAULT N'PENDING',
      ApplicationDate DATE NULL,
      ApprovedDate DATE NULL,
      ExpirationDate DATE NULL,
      Notes NVARCHAR(1500) NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_PersonCertification_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_PersonCertification_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_PersonCertification_Person FOREIGN KEY (PersonId) REFERENCES bbva.Person(Id),
      CONSTRAINT FK_BBVA_PersonCertification_Catalog FOREIGN KEY (CertificationId) REFERENCES bbva.CertificationCatalog(Id),
      CONSTRAINT CK_BBVA_PersonCertification_Source CHECK (Source IN (N'AUTO',N'MANUAL')),
      CONSTRAINT CK_BBVA_PersonCertification_Cycle CHECK (CurrentCycle > 0),
      CONSTRAINT CK_BBVA_PersonCertification_BaseStatus CHECK (BaseStatus IN (N'PENDING',N'SCHEDULED',N'APPLIED',N'FAILED',N'APPROVED',N'NOT_APPLICABLE'))
    );
  END;

  IF OBJECT_ID(N'bbva.PersonCertificationAttempt', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.PersonCertificationAttempt (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_PersonCertificationAttempt PRIMARY KEY DEFAULT NEWID(),
      PersonCertificationId UNIQUEIDENTIFIER NOT NULL,
      CycleNumber INT NOT NULL,
      AttemptNumber INT NOT NULL,
      ApplicationDate DATE NULL,
      Result NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_PersonCertificationAttempt_Result DEFAULT N'PENDING',
      ResultDate DATE NULL,
      CostAmount DECIMAL(12,2) NULL,
      CostCurrency NVARCHAR(8) NULL,
      Notes NVARCHAR(1000) NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_PersonCertificationAttempt_CreatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_PersonCertificationAttempt_Record FOREIGN KEY (PersonCertificationId) REFERENCES bbva.PersonCertification(Id),
      CONSTRAINT CK_BBVA_PersonCertificationAttempt_Cycle CHECK (CycleNumber > 0),
      CONSTRAINT CK_BBVA_PersonCertificationAttempt_Number CHECK (AttemptNumber > 0),
      CONSTRAINT CK_BBVA_PersonCertificationAttempt_Result CHECK (Result IN (N'PENDING',N'APPROVED',N'FAILED')),
      CONSTRAINT CK_BBVA_PersonCertificationAttempt_Cost CHECK (CostAmount IS NULL OR CostAmount >= 0)
    );
  END;

  IF OBJECT_ID(N'bbva.PersonCertificationHistory', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.PersonCertificationHistory (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_PersonCertificationHistory PRIMARY KEY DEFAULT NEWID(),
      PersonCertificationId UNIQUEIDENTIFIER NOT NULL,
      EventType NVARCHAR(50) NOT NULL,
      Description NVARCHAR(600) NOT NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_PersonCertificationHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_PersonCertificationHistory_Record FOREIGN KEY (PersonCertificationId) REFERENCES bbva.PersonCertification(Id)
    );
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_PersonCertification_Person_Certification' AND object_id=OBJECT_ID(N'bbva.PersonCertification'))
    CREATE UNIQUE INDEX UX_BBVA_PersonCertification_Person_Certification ON bbva.PersonCertification(PersonId, CertificationId);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_PersonCertification_Status' AND object_id=OBJECT_ID(N'bbva.PersonCertification'))
    CREATE INDEX IX_BBVA_PersonCertification_Status ON bbva.PersonCertification(Applicable, BaseStatus, ExpirationDate) INCLUDE (PersonId, CertificationId, Mandatory, CurrentCycle);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_PersonCertificationAttempt_Cycle_Attempt' AND object_id=OBJECT_ID(N'bbva.PersonCertificationAttempt'))
    CREATE UNIQUE INDEX UX_BBVA_PersonCertificationAttempt_Cycle_Attempt ON bbva.PersonCertificationAttempt(PersonCertificationId, CycleNumber, AttemptNumber);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_PersonCertificationHistory_Record_CreatedAt' AND object_id=OBJECT_ID(N'bbva.PersonCertificationHistory'))
    CREATE INDEX IX_BBVA_PersonCertificationHistory_Record_CreatedAt ON bbva.PersonCertificationHistory(PersonCertificationId, CreatedAt DESC);

  /* ----------------------------------------------------------------------
     Backfill de certificaciones aplicables para colaboradores activos.
     Regla: certificaciones tecnológicas coinciden con Tecnología actual;
     el nivel permitido coincide con Seniority o usa GENERIC. Las no
     tecnológicas aplican por nivel y configuración activa del catálogo.
     ---------------------------------------------------------------------- */
  DECLARE @Actor NVARCHAR(255)=N'bbva-certification-migration@local';

  INSERT INTO bbva.PersonCertification (
    PersonId, CertificationId, Applicable, Mandatory, Source, CurrentCycle, BaseStatus,
    CreatedByEmail, UpdatedByEmail
  )
  SELECT DISTINCT
    p.Id,
    cc.Id,
    1,
    cc.DefaultMandatory,
    N'AUTO',
    1,
    N'PENDING',
    @Actor,
    @Actor
  FROM bbva.Collaborator c
  INNER JOIN bbva.Person p ON p.Id=c.PersonId
  LEFT JOIN bbva.CatalogProfile cp ON cp.Id=p.ProfileCatalogId
  INNER JOIN bbva.CertificationCatalog cc ON cc.Status=N'ACTIVE'
  WHERE c.Status=N'ACTIVE'
    AND (
      (cc.CertificationType=N'TECHNOLOGICAL' AND cc.TechnologyId IS NOT NULL AND cc.TechnologyId=p.CurrentTechnologyCatalogId)
      OR cc.CertificationType<>N'TECHNOLOGICAL'
    )
    AND EXISTS (
      SELECT 1
      FROM bbva.CertificationAllowedLevel al
      WHERE al.CertificationId=cc.Id
        AND (al.LevelCode=N'GENERIC' OR al.LevelCode=UPPER(ISNULL(cp.Seniority,p.Expertise)))
    )
    AND NOT EXISTS (
      SELECT 1 FROM bbva.PersonCertification pc
      WHERE pc.PersonId=p.Id AND pc.CertificationId=cc.Id
    );

  INSERT INTO bbva.PersonCertificationHistory (PersonCertificationId,EventType,Description,CreatedByEmail)
  SELECT pc.Id,N'ASSIGNED',N'Certificación incorporada por las reglas de aplicabilidad vigentes.',@Actor
  FROM bbva.PersonCertification pc
  WHERE pc.CreatedByEmail=@Actor
    AND NOT EXISTS (
      SELECT 1 FROM bbva.PersonCertificationHistory h
      WHERE h.PersonCertificationId=pc.Id AND h.EventType=N'ASSIGNED'
    );

  COMMIT TRANSACTION;
  PRINT N'Certificaciones por colaborador y limpieza de vencimiento de persona configuradas correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
