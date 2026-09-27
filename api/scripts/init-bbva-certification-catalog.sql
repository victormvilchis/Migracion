SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    EXEC(N'CREATE SCHEMA bbva AUTHORIZATION dbo;');

  IF OBJECT_ID(N'bbva.CatalogTechnology', N'U') IS NULL OR OBJECT_ID(N'bbva.CatalogProfile', N'U') IS NULL OR OBJECT_ID(N'bbva.CatalogTechnologyProfile', N'U') IS NULL
    THROW 51000, 'Primero debe ejecutarse api/scripts/init-bbva-catalogs.sql.', 1;

  DECLARE @SeedActor NVARCHAR(255) = N'system@softtek.com';

  /* ----------------------------------------------------------------------
     Integridad referencial de los campos profesionales de Persona.
     Se conservan los textos actuales como snapshot histórico/portable y se
     agrega la referencia al catálogo para nuevas operaciones.
     ---------------------------------------------------------------------- */
  IF OBJECT_ID(N'bbva.Person', N'U') IS NOT NULL
  BEGIN
    /*
      SQL Server resuelve los nombres de columna al compilar el batch. Por eso
      una columna agregada con ALTER TABLE no puede referenciarse de forma
      estática más adelante en el mismo batch. Ejecutamos DDL y backfill de
      estas columnas mediante SQL dinámico para que la migración sea segura e
      idempotente sobre bases ya existentes.
    */
    IF COL_LENGTH(N'bbva.Person', N'ProfileCatalogId') IS NULL
      EXEC(N'ALTER TABLE bbva.Person ADD ProfileCatalogId UNIQUEIDENTIFIER NULL;');
    IF COL_LENGTH(N'bbva.Person', N'TechnologyProfileCatalogId') IS NULL
      EXEC(N'ALTER TABLE bbva.Person ADD TechnologyProfileCatalogId UNIQUEIDENTIFIER NULL;');
    IF COL_LENGTH(N'bbva.Person', N'CurrentTechnologyCatalogId') IS NULL
      EXEC(N'ALTER TABLE bbva.Person ADD CurrentTechnologyCatalogId UNIQUEIDENTIFIER NULL;');

    EXEC(N'
      UPDATE p SET ProfileCatalogId=c.Id
      FROM bbva.Person p
      INNER JOIN bbva.CatalogProfile c
        ON UPPER(LTRIM(RTRIM(c.Name)))=UPPER(LTRIM(RTRIM(p.Profile)))
      WHERE p.ProfileCatalogId IS NULL
        AND NULLIF(LTRIM(RTRIM(p.Profile)),N'''') IS NOT NULL;

      UPDATE p SET TechnologyProfileCatalogId=c.Id
      FROM bbva.Person p
      INNER JOIN bbva.CatalogTechnologyProfile c
        ON UPPER(LTRIM(RTRIM(c.Name)))=UPPER(LTRIM(RTRIM(p.TechnologyProfile)))
      WHERE p.TechnologyProfileCatalogId IS NULL
        AND NULLIF(LTRIM(RTRIM(p.TechnologyProfile)),N'''') IS NOT NULL;

      UPDATE p SET CurrentTechnologyCatalogId=c.Id
      FROM bbva.Person p
      INNER JOIN bbva.CatalogTechnology c
        ON UPPER(LTRIM(RTRIM(c.Name)))=UPPER(LTRIM(RTRIM(p.CurrentTechnology)))
      WHERE p.CurrentTechnologyCatalogId IS NULL
        AND NULLIF(LTRIM(RTRIM(p.CurrentTechnology)),N'''') IS NOT NULL;
    ');

    IF NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys
      WHERE name=N'FK_BBVA_Person_ProfileCatalog'
        AND parent_object_id=OBJECT_ID(N'bbva.Person')
    )
      EXEC(N'ALTER TABLE bbva.Person ADD CONSTRAINT FK_BBVA_Person_ProfileCatalog FOREIGN KEY (ProfileCatalogId) REFERENCES bbva.CatalogProfile(Id);');

    IF NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys
      WHERE name=N'FK_BBVA_Person_TechnologyProfileCatalog'
        AND parent_object_id=OBJECT_ID(N'bbva.Person')
    )
      EXEC(N'ALTER TABLE bbva.Person ADD CONSTRAINT FK_BBVA_Person_TechnologyProfileCatalog FOREIGN KEY (TechnologyProfileCatalogId) REFERENCES bbva.CatalogTechnologyProfile(Id);');

    IF NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys
      WHERE name=N'FK_BBVA_Person_CurrentTechnologyCatalog'
        AND parent_object_id=OBJECT_ID(N'bbva.Person')
    )
      EXEC(N'ALTER TABLE bbva.Person ADD CONSTRAINT FK_BBVA_Person_CurrentTechnologyCatalog FOREIGN KEY (CurrentTechnologyCatalogId) REFERENCES bbva.CatalogTechnology(Id);');

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_Person_ProfileCatalogId' AND object_id=OBJECT_ID(N'bbva.Person'))
      EXEC(N'CREATE INDEX IX_BBVA_Person_ProfileCatalogId ON bbva.Person(ProfileCatalogId);');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_Person_TechnologyProfileCatalogId' AND object_id=OBJECT_ID(N'bbva.Person'))
      EXEC(N'CREATE INDEX IX_BBVA_Person_TechnologyProfileCatalogId ON bbva.Person(TechnologyProfileCatalogId);');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_Person_CurrentTechnologyCatalogId' AND object_id=OBJECT_ID(N'bbva.Person'))
      EXEC(N'CREATE INDEX IX_BBVA_Person_CurrentTechnologyCatalogId ON bbva.Person(CurrentTechnologyCatalogId);');
  END;

  /* ----------------------------------------------------------------------
     Catálogo de certificaciones y configuración de reglas.
     ---------------------------------------------------------------------- */
  IF OBJECT_ID(N'bbva.CertificationCatalog', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CertificationCatalog (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CertificationCatalog PRIMARY KEY DEFAULT NEWID(),
      Name NVARCHAR(180) NOT NULL,
      Description NVARCHAR(1000) NULL,
      CertificationType NVARCHAR(40) NOT NULL,
      Provider NVARCHAR(120) NULL,
      TechnologyId UNIQUEIDENTIFIER NULL,
      ValidityMonths INT NULL,
      InitialCompletionMonths INT NULL,
      InitialCompletionDays INT NULL,
      ExpiringSoonDays INT NULL,
      FirstAttemptCost DECIMAL(12,2) NULL,
      SubsequentAttemptCost DECIMAL(12,2) NULL,
      CostCurrency NVARCHAR(8) NULL,
      IncludesTraining BIT NOT NULL CONSTRAINT DF_BBVA_CertificationCatalog_IncludesTraining DEFAULT 0,
      RecertificationEnabled BIT NOT NULL CONSTRAINT DF_BBVA_CertificationCatalog_Recert DEFAULT 0,
      RequiresAttempts BIT NOT NULL CONSTRAINT DF_BBVA_CertificationCatalog_Attempts DEFAULT 0,
      RequiresApplicationDate BIT NOT NULL CONSTRAINT DF_BBVA_CertificationCatalog_ApplicationDate DEFAULT 0,
      DefaultMandatory BIT NOT NULL CONSTRAINT DF_BBVA_CertificationCatalog_Mandatory DEFAULT 0,
      RequirementGroup NVARCHAR(80) NULL,
      RequirementGroupMinimum INT NULL,
      Status NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_CertificationCatalog_Status DEFAULT N'ACTIVE',
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CertificationCatalog_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CertificationCatalog_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_CertificationCatalog_Technology FOREIGN KEY (TechnologyId) REFERENCES bbva.CatalogTechnology(Id),
      CONSTRAINT CK_BBVA_CertificationCatalog_Type CHECK (CertificationType IN (N'TECHNOLOGICAL',N'METHODOLOGICAL',N'DEVELOPMENT_SECURITY',N'NORMATIVE_TESTING',N'COMPLIANCE')),
      CONSTRAINT CK_BBVA_CertificationCatalog_Status CHECK (Status IN (N'ACTIVE',N'INACTIVE')),
      CONSTRAINT CK_BBVA_CertificationCatalog_Validity CHECK (ValidityMonths IS NULL OR ValidityMonths > 0),
      CONSTRAINT CK_BBVA_CertificationCatalog_Completion CHECK (InitialCompletionMonths IS NULL OR InitialCompletionMonths > 0),
      CONSTRAINT CK_BBVA_CertificationCatalog_CompletionDays CHECK (InitialCompletionDays IS NULL OR InitialCompletionDays > 0),
      CONSTRAINT CK_BBVA_CertificationCatalog_ExpiringSoon CHECK (ExpiringSoonDays IS NULL OR ExpiringSoonDays > 0),
      CONSTRAINT CK_BBVA_CertificationCatalog_FirstCost CHECK (FirstAttemptCost IS NULL OR FirstAttemptCost >= 0),
      CONSTRAINT CK_BBVA_CertificationCatalog_SubsequentCost CHECK (SubsequentAttemptCost IS NULL OR SubsequentAttemptCost >= 0),
      CONSTRAINT CK_BBVA_CertificationCatalog_Currency CHECK (CostCurrency IS NULL OR CostCurrency IN (N'USD',N'MXN')),
      CONSTRAINT CK_BBVA_CertificationCatalog_GroupMin CHECK (RequirementGroupMinimum IS NULL OR RequirementGroupMinimum > 0)
    );
  END;

  IF COL_LENGTH(N'bbva.CertificationCatalog', N'InitialCompletionDays') IS NULL ALTER TABLE bbva.CertificationCatalog ADD InitialCompletionDays INT NULL;
  IF COL_LENGTH(N'bbva.CertificationCatalog', N'ExpiringSoonDays') IS NULL ALTER TABLE bbva.CertificationCatalog ADD ExpiringSoonDays INT NULL;
  IF COL_LENGTH(N'bbva.CertificationCatalog', N'FirstAttemptCost') IS NULL ALTER TABLE bbva.CertificationCatalog ADD FirstAttemptCost DECIMAL(12,2) NULL;
  IF COL_LENGTH(N'bbva.CertificationCatalog', N'SubsequentAttemptCost') IS NULL ALTER TABLE bbva.CertificationCatalog ADD SubsequentAttemptCost DECIMAL(12,2) NULL;
  IF COL_LENGTH(N'bbva.CertificationCatalog', N'CostCurrency') IS NULL ALTER TABLE bbva.CertificationCatalog ADD CostCurrency NVARCHAR(8) NULL;
  IF COL_LENGTH(N'bbva.CertificationCatalog', N'IncludesTraining') IS NULL ALTER TABLE bbva.CertificationCatalog ADD IncludesTraining BIT NOT NULL CONSTRAINT DF_BBVA_CertificationCatalog_IncludesTraining_Upgrade DEFAULT 0;

  IF OBJECT_ID(N'bbva.CertificationAllowedLevel', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CertificationAllowedLevel (
      CertificationId UNIQUEIDENTIFIER NOT NULL,
      LevelCode NVARCHAR(16) NOT NULL,
      CONSTRAINT PK_BBVA_CertificationAllowedLevel PRIMARY KEY (CertificationId, LevelCode),
      CONSTRAINT FK_BBVA_CertificationAllowedLevel_Certification FOREIGN KEY (CertificationId) REFERENCES bbva.CertificationCatalog(Id),
      CONSTRAINT CK_BBVA_CertificationAllowedLevel_Level CHECK (LevelCode IN (N'JR',N'STD',N'SR',N'GENERIC'))
    );
  END;


  IF OBJECT_ID(N'bbva.CertificationCatalogHistory', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CertificationCatalogHistory (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CertificationCatalogHistory PRIMARY KEY DEFAULT NEWID(),
      CertificationId UNIQUEIDENTIFIER NULL,
      EventType NVARCHAR(40) NOT NULL,
      Description NVARCHAR(500) NOT NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CertificationCatalogHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL
    );
  END;

  IF OBJECT_ID(N'bbva.PersonCertification', N'U') IS NULL AND OBJECT_ID(N'bbva.Person', N'U') IS NOT NULL
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

  IF OBJECT_ID(N'bbva.PersonCertificationAttempt', N'U') IS NULL AND OBJECT_ID(N'bbva.PersonCertification', N'U') IS NOT NULL
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

  IF OBJECT_ID(N'bbva.PersonCertificationHistory', N'U') IS NULL AND OBJECT_ID(N'bbva.PersonCertification', N'U') IS NOT NULL
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

  IF OBJECT_ID(N'bbva.PersonCertification', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_PersonCertification_Person_Certification' AND object_id=OBJECT_ID(N'bbva.PersonCertification'))
    CREATE UNIQUE INDEX UX_BBVA_PersonCertification_Person_Certification ON bbva.PersonCertification(PersonId,CertificationId);
  IF OBJECT_ID(N'bbva.PersonCertification', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_PersonCertification_Status' AND object_id=OBJECT_ID(N'bbva.PersonCertification'))
    CREATE INDEX IX_BBVA_PersonCertification_Status ON bbva.PersonCertification(Applicable,BaseStatus,ExpirationDate) INCLUDE (PersonId,CertificationId,Mandatory,CurrentCycle);
  IF OBJECT_ID(N'bbva.PersonCertificationAttempt', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_PersonCertificationAttempt_Cycle_Attempt' AND object_id=OBJECT_ID(N'bbva.PersonCertificationAttempt'))
    CREATE UNIQUE INDEX UX_BBVA_PersonCertificationAttempt_Cycle_Attempt ON bbva.PersonCertificationAttempt(PersonCertificationId,CycleNumber,AttemptNumber);
  IF OBJECT_ID(N'bbva.PersonCertificationHistory', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_PersonCertificationHistory_Record_CreatedAt' AND object_id=OBJECT_ID(N'bbva.PersonCertificationHistory'))
    CREATE INDEX IX_BBVA_PersonCertificationHistory_Record_CreatedAt ON bbva.PersonCertificationHistory(PersonCertificationId,CreatedAt DESC);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_CertificationCatalog_Name' AND object_id=OBJECT_ID(N'bbva.CertificationCatalog'))
    CREATE UNIQUE INDEX UX_BBVA_CertificationCatalog_Name ON bbva.CertificationCatalog(Name);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_CertificationCatalog_Status_Type' AND object_id=OBJECT_ID(N'bbva.CertificationCatalog'))
    CREATE INDEX IX_BBVA_CertificationCatalog_Status_Type ON bbva.CertificationCatalog(Status, CertificationType, Name) INCLUDE (ValidityMonths,InitialCompletionMonths,TechnologyId);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_CertificationCatalogHistory_Certification' AND object_id=OBJECT_ID(N'bbva.CertificationCatalogHistory'))
    CREATE INDEX IX_BBVA_CertificationCatalogHistory_Certification ON bbva.CertificationCatalogHistory(CertificationId, CreatedAt DESC);

  /* ----------------------------------------------------------------------
     Ingesta de tecnologías necesarias para las certificaciones del manual.
     ---------------------------------------------------------------------- */
  /* Normalización segura de seniority para perfiles existentes sin clasificar. */
  UPDATE bbva.CatalogProfile
  SET Seniority = CASE
      WHEN UPPER(Name) LIKE N'% JR %' OR UPPER(Name) LIKE N'% JR' THEN N'JR'
      WHEN UPPER(Name) LIKE N'% STD %' OR UPPER(Name) LIKE N'% STD' THEN N'STD'
      WHEN UPPER(Name) LIKE N'% SR %' OR UPPER(Name) LIKE N'% SR' THEN N'SR'
      ELSE Seniority
    END,
    UpdatedAt = CASE WHEN Seniority IS NULL THEN SYSUTCDATETIME() ELSE UpdatedAt END,
    UpdatedByEmail = CASE WHEN Seniority IS NULL THEN @SeedActor ELSE UpdatedByEmail END
  WHERE Seniority IS NULL;

  DECLARE @TechnologySeeds TABLE (Name NVARCHAR(180));
  INSERT INTO @TechnologySeeds (Name) VALUES
    (N'HOST'), (N'IPC ETL'), (N'JAVA'), (N'MICROSTRATEGY'),
    (N'ORACLE'), (N'SAS'), (N'CELLS'), (N'DATIO'), (N'HTML'),
    (N'INTELIGENCIA ARTIFICIAL'), (N'LRBA'), (N'NACAR'), (N'ANDROID'),
    (N'SALESFORCE'), (N'API MARKET'), (N'APX'), (N'ISTQB'),
    (N'API CHANNELS'), (N'ASO'), (N'IOS');

  INSERT INTO bbva.CatalogTechnology (Name,Description,CreatedByEmail,UpdatedByEmail)
    SELECT s.Name,N'Tecnología habilitada para configuración de certificaciones.',@SeedActor,@SeedActor
    FROM @TechnologySeeds s
    WHERE NOT EXISTS (SELECT 1 FROM bbva.CatalogTechnology t WHERE UPPER(t.Name)=UPPER(s.Name));

  /* ----------------------------------------------------------------------
     Ingesta inicial del catálogo. La matriz detallada de seniority del manual
     se utiliza como fuente para certificadora y niveles permitidos.
     ---------------------------------------------------------------------- */
  DECLARE @CertificationSeeds TABLE (
    Name NVARCHAR(180), CertificationType NVARCHAR(40), Provider NVARCHAR(120), TechnologyName NVARCHAR(180),
    ValidityMonths INT NULL, CompletionMonths INT NULL, Recert BIT, Attempts BIT, ApplicationDate BIT, Mandatory BIT,
    RequirementGroup NVARCHAR(80) NULL, RequirementGroupMinimum INT NULL, Levels NVARCHAR(100), Description NVARCHAR(1000)
  );

  INSERT INTO @CertificationSeeds VALUES
    (N'BI HOST SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'HOST',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI Host.'),
    (N'BI IPC ETL SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'IPC ETL',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI IPC ETL.'),
    (N'BI JAVA SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'JAVA',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI Java.'),
    (N'BI MICROSTRATEGY SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'MICROSTRATEGY',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI MicroStrategy.'),
    (N'BI ORACLE SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'ORACLE',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI Oracle.'),
    (N'BI SAS SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'SAS',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI SAS.'),
    (N'CELLS',N'TECHNOLOGICAL',N'MAINWARE',N'CELLS',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Cells.'),
    (N'DATIO',N'TECHNOLOGICAL',N'MAINWARE',N'DATIO',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Datio.'),
    (N'HTML',N'TECHNOLOGICAL',N'MAINWARE',N'HTML',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica HTML.'),
    (N'INTELIGENCIA ARTIFICIAL',N'TECHNOLOGICAL',N'MAINWARE',N'INTELIGENCIA ARTIFICIAL',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica de Inteligencia Artificial.'),
    (N'JAVA 8',N'TECHNOLOGICAL',N'MAINWARE',N'JAVA',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Java 8.'),
    (N'JAVA',N'TECHNOLOGICAL',N'MAINWARE',N'JAVA',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Java.'),
    (N'LRBA',N'TECHNOLOGICAL',N'MAINWARE',N'LRBA',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica LRBA.'),
    (N'NACAR LIGERO',N'TECHNOLOGICAL',N'MAINWARE',N'NACAR',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Nacar Ligero.'),
    (N'ORACLE',N'TECHNOLOGICAL',N'MAINWARE',N'ORACLE',24,NULL,1,1,1,1,NULL,NULL,N'STD,SR',N'Certificación tecnológica Oracle.'),
    (N'ANDROID',N'TECHNOLOGICAL',N'NETEC',N'ANDROID',24,NULL,1,1,1,1,NULL,NULL,N'GENERIC',N'Certificación tecnológica Android.'),
    (N'SALESFORCE',N'TECHNOLOGICAL',N'NETEC',N'SALESFORCE',24,NULL,1,1,1,1,NULL,NULL,N'GENERIC',N'Certificación tecnológica Salesforce.'),
    (N'API MARKET',N'TECHNOLOGICAL',N'NETEC',N'API MARKET',24,NULL,1,1,1,1,NULL,NULL,N'GENERIC',N'Certificación tecnológica API Market.'),
    (N'JAVA - APX',N'TECHNOLOGICAL',N'NETEC',N'APX',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Java - APX.'),
    (N'ISTQB',N'TECHNOLOGICAL',N'NETEC',N'ISTQB',24,NULL,1,1,1,1,NULL,NULL,N'STD,SR',N'Certificación tecnológica ISTQB.'),
    (N'API CHANNEL',N'TECHNOLOGICAL',N'NETEC',N'API CHANNELS',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica API Channel.'),
    (N'ASO DESARROLLO',N'TECHNOLOGICAL',N'NETEC',N'ASO',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,GENERIC',N'Certificación tecnológica ASO Desarrollo.'),
    (N'ASO DISEÑO',N'TECHNOLOGICAL',N'NETEC',N'ASO',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD',N'Certificación tecnológica ASO Diseño.'),
    (N'DESARROLLO SEGURO',N'DEVELOPMENT_SECURITY',N'NETEC',NULL,12,NULL,1,1,1,1,NULL,NULL,N'GENERIC',N'Certificación de seguridad con recertificación anual.'),
    (N'SAFE PRACTITIONER',N'METHODOLOGICAL',N'SCALED AGILE',NULL,NULL,NULL,0,1,1,1,N'METHODOLOGICAL',1,N'GENERIC',N'Certificación metodológica de conocimiento ágil; certificación única.'),
    (N'SCRUM DEVELOPER',N'METHODOLOGICAL',N'SCRUM INSTITUTE',NULL,NULL,NULL,0,1,1,1,N'METHODOLOGICAL',1,N'GENERIC',N'Certificación metodológica de conocimiento ágil; certificación única.');

  INSERT INTO bbva.CertificationCatalog (
    Name,Description,CertificationType,Provider,TechnologyId,ValidityMonths,InitialCompletionMonths,InitialCompletionDays,
    RecertificationEnabled,RequiresAttempts,RequiresApplicationDate,DefaultMandatory,RequirementGroup,RequirementGroupMinimum,
    Status,CreatedByEmail,UpdatedByEmail
  )
  SELECT s.Name,s.Description,s.CertificationType,s.Provider,t.Id,s.ValidityMonths,s.CompletionMonths,CASE WHEN s.CompletionMonths IS NULL THEN NULL ELSE s.CompletionMonths * 30 END,
         s.Recert,s.Attempts,s.ApplicationDate,s.Mandatory,s.RequirementGroup,s.RequirementGroupMinimum,
         N'ACTIVE',@SeedActor,@SeedActor
  FROM @CertificationSeeds s
  LEFT JOIN bbva.CatalogTechnology t ON s.TechnologyName IS NOT NULL AND UPPER(t.Name)=UPPER(s.TechnologyName)
  WHERE NOT EXISTS (SELECT 1 FROM bbva.CertificationCatalog c WHERE UPPER(c.Name)=UPPER(s.Name));


  UPDATE bbva.CertificationCatalog SET InitialCompletionDays=30 WHERE CertificationType=N'TECHNOLOGICAL' AND InitialCompletionDays IS NULL;
  UPDATE bbva.CertificationCatalog SET InitialCompletionDays=90 WHERE CertificationType=N'DEVELOPMENT_SECURITY' AND InitialCompletionDays IS NULL;
  UPDATE bbva.CertificationCatalog SET InitialCompletionDays=60 WHERE CertificationType=N'NORMATIVE_TESTING' AND InitialCompletionDays IS NULL;

  /* Costos de intento/resultados quedan fuera del contrato funcional BBVA.
     Las columnas legacy se conservan únicamente para compatibilidad histórica. */
  UPDATE c SET IncludesTraining=1
  FROM bbva.CertificationCatalog c
  WHERE c.Name=N'SAFE PRACTITIONER';

  UPDATE c SET IncludesTraining=0
  FROM bbva.CertificationCatalog c
  WHERE c.Name=N'SCRUM DEVELOPER';

  /* Niveles permitidos de la matriz. */
  INSERT INTO bbva.CertificationAllowedLevel (CertificationId,LevelCode)
  SELECT c.Id, LTRIM(RTRIM(ss.value))
  FROM @CertificationSeeds s
  INNER JOIN bbva.CertificationCatalog c ON UPPER(c.Name)=UPPER(s.Name)
  CROSS APPLY STRING_SPLIT(s.Levels,N',') ss
  WHERE NOT EXISTS (
    SELECT 1 FROM bbva.CertificationAllowedLevel l
    WHERE l.CertificationId=c.Id AND l.LevelCode=LTRIM(RTRIM(ss.value))
  );


  /* Auditoría de la ingesta inicial, una sola vez por certificación. */
  INSERT INTO bbva.CertificationCatalogHistory (CertificationId,EventType,Description,CreatedByEmail)
  SELECT c.Id,N'SEEDED',N'Registro incorporado mediante la configuración inicial del catálogo.',@SeedActor
  FROM bbva.CertificationCatalog c
  INNER JOIN @CertificationSeeds s ON UPPER(s.Name)=UPPER(c.Name)
  WHERE NOT EXISTS (SELECT 1 FROM bbva.CertificationCatalogHistory h WHERE h.CertificationId=c.Id AND h.EventType=N'SEEDED');

  COMMIT TRANSACTION;
  PRINT N'Catálogo de certificaciones BBVA y referencias a catálogos configurados correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
