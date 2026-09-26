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
      Code NVARCHAR(80) NOT NULL,
      Name NVARCHAR(180) NOT NULL,
      Description NVARCHAR(1000) NULL,
      CertificationType NVARCHAR(40) NOT NULL,
      Provider NVARCHAR(120) NULL,
      TechnologyId UNIQUEIDENTIFIER NULL,
      ValidityMonths INT NULL,
      InitialCompletionMonths INT NULL,
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
      CONSTRAINT CK_BBVA_CertificationCatalog_ExpiringSoon CHECK (ExpiringSoonDays IS NULL OR ExpiringSoonDays > 0),
      CONSTRAINT CK_BBVA_CertificationCatalog_FirstCost CHECK (FirstAttemptCost IS NULL OR FirstAttemptCost >= 0),
      CONSTRAINT CK_BBVA_CertificationCatalog_SubsequentCost CHECK (SubsequentAttemptCost IS NULL OR SubsequentAttemptCost >= 0),
      CONSTRAINT CK_BBVA_CertificationCatalog_Currency CHECK (CostCurrency IS NULL OR CostCurrency IN (N'USD',N'MXN')),
      CONSTRAINT CK_BBVA_CertificationCatalog_GroupMin CHECK (RequirementGroupMinimum IS NULL OR RequirementGroupMinimum > 0)
    );
  END;

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

  IF OBJECT_ID(N'bbva.CertificationProfileRule', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CertificationProfileRule (
      CertificationId UNIQUEIDENTIFIER NOT NULL,
      ProfileId UNIQUEIDENTIFIER NOT NULL,
      IsMandatory BIT NOT NULL CONSTRAINT DF_BBVA_CertificationProfileRule_Mandatory DEFAULT 0,
      CONSTRAINT PK_BBVA_CertificationProfileRule PRIMARY KEY (CertificationId, ProfileId),
      CONSTRAINT FK_BBVA_CertificationProfileRule_Certification FOREIGN KEY (CertificationId) REFERENCES bbva.CertificationCatalog(Id),
      CONSTRAINT FK_BBVA_CertificationProfileRule_Profile FOREIGN KEY (ProfileId) REFERENCES bbva.CatalogProfile(Id)
    );
  END;

  IF OBJECT_ID(N'bbva.CertificationCatalogHistory', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CertificationCatalogHistory (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CertificationCatalogHistory PRIMARY KEY DEFAULT NEWID(),
      CertificationId UNIQUEIDENTIFIER NULL,
      CertificationCode NVARCHAR(80) NOT NULL,
      EventType NVARCHAR(40) NOT NULL,
      Description NVARCHAR(500) NOT NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CertificationCatalogHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL
    );
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_CertificationCatalog_Code' AND object_id=OBJECT_ID(N'bbva.CertificationCatalog'))
    CREATE UNIQUE INDEX UX_BBVA_CertificationCatalog_Code ON bbva.CertificationCatalog(Code);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_CertificationCatalog_Name' AND object_id=OBJECT_ID(N'bbva.CertificationCatalog'))
    CREATE UNIQUE INDEX UX_BBVA_CertificationCatalog_Name ON bbva.CertificationCatalog(Name);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_CertificationCatalog_Status_Type' AND object_id=OBJECT_ID(N'bbva.CertificationCatalog'))
    CREATE INDEX IX_BBVA_CertificationCatalog_Status_Type ON bbva.CertificationCatalog(Status, CertificationType, Name) INCLUDE (ValidityMonths,InitialCompletionMonths,TechnologyId);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_CertificationProfileRule_Profile' AND object_id=OBJECT_ID(N'bbva.CertificationProfileRule'))
    CREATE INDEX IX_BBVA_CertificationProfileRule_Profile ON bbva.CertificationProfileRule(ProfileId, CertificationId);
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

  DECLARE @TechnologySeeds TABLE (Name NVARCHAR(180), Code NVARCHAR(80));
  INSERT INTO @TechnologySeeds (Name,Code) VALUES
    (N'HOST',N'HOST'), (N'IPC ETL',N'IPC_ETL'), (N'JAVA',N'JAVA'), (N'MICROSTRATEGY',N'MICROSTRATEGY'),
    (N'ORACLE',N'ORACLE'), (N'SAS',N'SAS'), (N'CELLS',N'CELLS'), (N'DATIO',N'DATIO'), (N'HTML',N'HTML'),
    (N'INTELIGENCIA ARTIFICIAL',N'IA'), (N'LRBA',N'LRBA'), (N'NACAR',N'NACAR'), (N'ANDROID',N'ANDROID'),
    (N'SALESFORCE',N'SALESFORCE'), (N'API MARKET',N'API_MARKET'), (N'APX',N'APX'), (N'ISTQB',N'ISTQB'),
    (N'API CHANNELS',N'API_CHANNELS'), (N'ASO',N'ASO'), (N'IOS',N'IOS');

  INSERT INTO bbva.CatalogTechnology (Name,Code,Description,CreatedByEmail,UpdatedByEmail)
    SELECT s.Name,s.Code,N'Tecnología habilitada para configuración de certificaciones.',@SeedActor,@SeedActor
    FROM @TechnologySeeds s
    WHERE NOT EXISTS (SELECT 1 FROM bbva.CatalogTechnology t WHERE UPPER(t.Name)=UPPER(s.Name));

  /* ----------------------------------------------------------------------
     Ingesta inicial del catálogo. La matriz detallada de seniority del manual
     se utiliza como fuente para certificadora y niveles permitidos.
     ---------------------------------------------------------------------- */
  DECLARE @CertificationSeeds TABLE (
    Code NVARCHAR(80), Name NVARCHAR(180), CertificationType NVARCHAR(40), Provider NVARCHAR(120), TechnologyName NVARCHAR(180),
    ValidityMonths INT NULL, CompletionMonths INT NULL, Recert BIT, Attempts BIT, ApplicationDate BIT, Mandatory BIT,
    RequirementGroup NVARCHAR(80) NULL, RequirementGroupMinimum INT NULL, Levels NVARCHAR(100), Description NVARCHAR(1000)
  );

  INSERT INTO @CertificationSeeds VALUES
    (N'TECH_BI_HOST_SR',N'BI HOST SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'HOST',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI Host.'),
    (N'TECH_BI_IPC_ETL_SR',N'BI IPC ETL SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'IPC ETL',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI IPC ETL.'),
    (N'TECH_BI_JAVA_SR',N'BI JAVA SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'JAVA',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI Java.'),
    (N'TECH_BI_MICROSTRATEGY_SR',N'BI MICROSTRATEGY SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'MICROSTRATEGY',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI MicroStrategy.'),
    (N'TECH_BI_ORACLE_SR',N'BI ORACLE SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'ORACLE',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI Oracle.'),
    (N'TECH_BI_SAS_SR',N'BI SAS SENIOR',N'TECHNOLOGICAL',N'MAINWARE',N'SAS',24,NULL,1,1,1,1,NULL,NULL,N'SR',N'Certificación tecnológica de BI SAS.'),
    (N'TECH_CELLS',N'CELLS',N'TECHNOLOGICAL',N'MAINWARE',N'CELLS',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Cells.'),
    (N'TECH_DATIO',N'DATIO',N'TECHNOLOGICAL',N'MAINWARE',N'DATIO',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Datio.'),
    (N'TECH_HTML',N'HTML',N'TECHNOLOGICAL',N'MAINWARE',N'HTML',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica HTML.'),
    (N'TECH_AI',N'INTELIGENCIA ARTIFICIAL',N'TECHNOLOGICAL',N'MAINWARE',N'INTELIGENCIA ARTIFICIAL',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica de Inteligencia Artificial.'),
    (N'TECH_JAVA_8',N'JAVA 8',N'TECHNOLOGICAL',N'MAINWARE',N'JAVA',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Java 8.'),
    (N'TECH_JAVA',N'JAVA',N'TECHNOLOGICAL',N'MAINWARE',N'JAVA',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Java.'),
    (N'TECH_LRBA',N'LRBA',N'TECHNOLOGICAL',N'MAINWARE',N'LRBA',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica LRBA.'),
    (N'TECH_NACAR_LIGERO',N'NACAR LIGERO',N'TECHNOLOGICAL',N'MAINWARE',N'NACAR',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Nacar Ligero.'),
    (N'TECH_ORACLE',N'ORACLE',N'TECHNOLOGICAL',N'MAINWARE',N'ORACLE',24,NULL,1,1,1,1,NULL,NULL,N'STD,SR',N'Certificación tecnológica Oracle.'),
    (N'TECH_ANDROID',N'ANDROID',N'TECHNOLOGICAL',N'NETEC',N'ANDROID',24,NULL,1,1,1,1,NULL,NULL,N'GENERIC',N'Certificación tecnológica Android.'),
    (N'TECH_SALESFORCE',N'SALESFORCE',N'TECHNOLOGICAL',N'NETEC',N'SALESFORCE',24,NULL,1,1,1,1,NULL,NULL,N'GENERIC',N'Certificación tecnológica Salesforce.'),
    (N'TECH_API_MARKET',N'API MARKET',N'TECHNOLOGICAL',N'NETEC',N'API MARKET',24,NULL,1,1,1,1,NULL,NULL,N'GENERIC',N'Certificación tecnológica API Market.'),
    (N'TECH_JAVA_APX',N'JAVA - APX',N'TECHNOLOGICAL',N'NETEC',N'APX',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica Java - APX.'),
    (N'TECH_ISTQB',N'ISTQB',N'TECHNOLOGICAL',N'NETEC',N'ISTQB',24,NULL,1,1,1,1,NULL,NULL,N'STD,SR',N'Certificación tecnológica ISTQB.'),
    (N'TECH_API_CHANNEL',N'API CHANNEL',N'TECHNOLOGICAL',N'NETEC',N'API CHANNELS',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,SR',N'Certificación tecnológica API Channel.'),
    (N'TECH_ASO_DEVELOPMENT',N'ASO DESARROLLO',N'TECHNOLOGICAL',N'NETEC',N'ASO',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD,GENERIC',N'Certificación tecnológica ASO Desarrollo.'),
    (N'TECH_ASO_DESIGN',N'ASO DISEÑO',N'TECHNOLOGICAL',N'NETEC',N'ASO',24,NULL,1,1,1,1,NULL,NULL,N'JR,STD',N'Certificación tecnológica ASO Diseño.'),
    (N'DEVELOPMENT_SECURITY',N'DESARROLLO SEGURO',N'DEVELOPMENT_SECURITY',N'NETEC',NULL,12,NULL,1,1,1,1,NULL,NULL,N'GENERIC',N'Certificación de seguridad con recertificación anual.'),
    (N'METH_SAFE_PRACTITIONER',N'SAFE PRACTITIONER',N'METHODOLOGICAL',N'SCALED AGILE',NULL,NULL,NULL,0,1,1,1,N'METHODOLOGICAL',1,N'GENERIC',N'Certificación metodológica de conocimiento ágil; certificación única.'),
    (N'METH_SCRUM_DEVELOPER',N'SCRUM DEVELOPER',N'METHODOLOGICAL',N'SCRUM INSTITUTE',NULL,NULL,NULL,0,1,1,1,N'METHODOLOGICAL',1,N'GENERIC',N'Certificación metodológica de conocimiento ágil; certificación única.');

  INSERT INTO bbva.CertificationCatalog (
    Code,Name,Description,CertificationType,Provider,TechnologyId,ValidityMonths,InitialCompletionMonths,
    RecertificationEnabled,RequiresAttempts,RequiresApplicationDate,DefaultMandatory,RequirementGroup,RequirementGroupMinimum,
    Status,CreatedByEmail,UpdatedByEmail
  )
  SELECT s.Code,s.Name,s.Description,s.CertificationType,s.Provider,t.Id,s.ValidityMonths,s.CompletionMonths,
         s.Recert,s.Attempts,s.ApplicationDate,s.Mandatory,s.RequirementGroup,s.RequirementGroupMinimum,
         N'ACTIVE',@SeedActor,@SeedActor
  FROM @CertificationSeeds s
  LEFT JOIN bbva.CatalogTechnology t ON s.TechnologyName IS NOT NULL AND UPPER(t.Name)=UPPER(s.TechnologyName)
  WHERE NOT EXISTS (SELECT 1 FROM bbva.CertificationCatalog c WHERE c.Code=s.Code);

  /* Configuración económica y de alertamiento incorporada desde la fuente operativa. */
  UPDATE c SET FirstAttemptCost=53.00,SubsequentAttemptCost=47.00,CostCurrency=N'USD'
  FROM bbva.CertificationCatalog c INNER JOIN @CertificationSeeds s ON s.Code=c.Code
  WHERE c.Provider=N'NETEC' AND c.FirstAttemptCost IS NULL AND c.CreatedByEmail=@SeedActor AND c.UpdatedByEmail=@SeedActor;

  UPDATE c SET FirstAttemptCost=1800.00,SubsequentAttemptCost=1800.00,CostCurrency=N'MXN'
  FROM bbva.CertificationCatalog c INNER JOIN @CertificationSeeds s ON s.Code=c.Code
  WHERE c.Provider=N'MAINWARE' AND c.FirstAttemptCost IS NULL AND c.CreatedByEmail=@SeedActor AND c.UpdatedByEmail=@SeedActor;

  UPDATE c SET FirstAttemptCost=120.00,SubsequentAttemptCost=120.00,CostCurrency=N'USD',IncludesTraining=1
  FROM bbva.CertificationCatalog c
  WHERE c.Code=N'METH_SAFE_PRACTITIONER' AND c.FirstAttemptCost IS NULL AND c.CreatedByEmail=@SeedActor AND c.UpdatedByEmail=@SeedActor;

  UPDATE c SET FirstAttemptCost=49.00,SubsequentAttemptCost=49.00,CostCurrency=N'USD',IncludesTraining=0
  FROM bbva.CertificationCatalog c
  WHERE c.Code=N'METH_SCRUM_DEVELOPER' AND c.FirstAttemptCost IS NULL AND c.CreatedByEmail=@SeedActor AND c.UpdatedByEmail=@SeedActor;

  /* Niveles permitidos de la matriz. */
  INSERT INTO bbva.CertificationAllowedLevel (CertificationId,LevelCode)
  SELECT c.Id, LTRIM(RTRIM(ss.value))
  FROM @CertificationSeeds s
  INNER JOIN bbva.CertificationCatalog c ON c.Code=s.Code
  CROSS APPLY STRING_SPLIT(s.Levels,N',') ss
  WHERE NOT EXISTS (
    SELECT 1 FROM bbva.CertificationAllowedLevel l
    WHERE l.CertificationId=c.Id AND l.LevelCode=LTRIM(RTRIM(ss.value))
  );

  /* Reglas de aplicabilidad por perfil. GENERIC aplica a todos los perfiles activos;
     JR/STD/SR se vinculan por seniority del catálogo de perfiles. */
  INSERT INTO bbva.CertificationProfileRule (CertificationId,ProfileId,IsMandatory)
  SELECT DISTINCT c.Id,p.Id,
         c.DefaultMandatory
  FROM bbva.CertificationCatalog c
  INNER JOIN bbva.CertificationAllowedLevel l ON l.CertificationId=c.Id
  INNER JOIN bbva.CatalogProfile p ON p.Status=N'ACTIVE' AND (
       l.LevelCode=N'GENERIC' OR UPPER(ISNULL(p.Seniority,N''))=l.LevelCode
  )
  WHERE NOT EXISTS (
    SELECT 1 FROM bbva.CertificationProfileRule r WHERE r.CertificationId=c.Id AND r.ProfileId=p.Id
  );

  /* Auditoría de la ingesta inicial, una sola vez por código. */
  INSERT INTO bbva.CertificationCatalogHistory (CertificationId,CertificationCode,EventType,Description,CreatedByEmail)
  SELECT c.Id,c.Code,N'SEEDED',N'Registro incorporado mediante la configuración inicial del catálogo.',@SeedActor
  FROM bbva.CertificationCatalog c
  INNER JOIN @CertificationSeeds s ON s.Code=c.Code
  WHERE NOT EXISTS (SELECT 1 FROM bbva.CertificationCatalogHistory h WHERE h.CertificationCode=c.Code AND h.EventType=N'SEEDED');

  COMMIT TRANSACTION;
  PRINT N'Catálogo de certificaciones BBVA, reglas y referencias a catálogos configurados correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
