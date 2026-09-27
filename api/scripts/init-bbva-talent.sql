SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    EXEC(N'CREATE SCHEMA bbva AUTHORIZATION dbo;');

  IF OBJECT_ID(N'bbva.Person', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.Person (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_Person PRIMARY KEY DEFAULT NEWID(),
      SofttekCode NVARCHAR(80) NULL,
      CorporateUser NVARCHAR(100) NULL,
      Email NVARCHAR(255) NOT NULL,
      FirstName NVARCHAR(120) NOT NULL,
      LastName NVARCHAR(180) NULL,
      Profile NVARCHAR(120) NULL,
      TechnologyProfile NVARCHAR(120) NULL,
      CurrentTechnology NVARCHAR(120) NULL,
      Expertise NVARCHAR(40) NULL,
      HireDate DATE NULL,
      Notes NVARCHAR(2000) NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_Person_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_Person_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL
    );
  END;

  IF OBJECT_ID(N'bbva.TalentBankEntry', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.TalentBankEntry (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_TalentBankEntry PRIMARY KEY DEFAULT NEWID(),
      PersonId UNIQUEIDENTIFIER NOT NULL,
      LegacyTalentId UNIQUEIDENTIFIER NULL,
      TalentType NVARCHAR(30) NOT NULL,
      Stage NVARCHAR(30) NOT NULL,
      Active BIT NOT NULL CONSTRAINT DF_BBVA_TalentBankEntry_Active DEFAULT 1,
      PlatformStartDate DATE NULL,
      EntryDate DATE NOT NULL CONSTRAINT DF_BBVA_TalentBankEntry_EntryDate DEFAULT CONVERT(date, SYSUTCDATETIME()),
      ConvertedAt DATETIME2(3) NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_TalentBankEntry_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_TalentBankEntry_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_TalentBankEntry_Person FOREIGN KEY (PersonId) REFERENCES bbva.Person(Id),
      CONSTRAINT CK_BBVA_TalentBankEntry_Type CHECK (TalentType IN (N'ACADEMY', N'PROSPECT', N'BBVA_EXIT')),
      CONSTRAINT CK_BBVA_TalentBankEntry_Stage CHECK (Stage IN (N'REGISTERED', N'ACADEMY', N'TRAINING', N'EVALUATION', N'AVAILABLE', N'UNASSIGNED', N'CONVERTED'))
    );
  END;

  IF OBJECT_ID(N'bbva.PersonDocument', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.PersonDocument (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_PersonDocument PRIMARY KEY DEFAULT NEWID(),
      PersonId UNIQUEIDENTIFIER NOT NULL,
      DocumentType NVARCHAR(30) NOT NULL,
      FileName NVARCHAR(255) NOT NULL,
      ContentType NVARCHAR(150) NOT NULL,
      FileExtension NVARCHAR(10) NOT NULL,
      FileSizeBytes INT NOT NULL,
      FileContent VARBINARY(MAX) NOT NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_PersonDocument_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_PersonDocument_UpdatedAt DEFAULT SYSUTCDATETIME(),
      UploadedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_PersonDocument_Person FOREIGN KEY (PersonId) REFERENCES bbva.Person(Id),
      CONSTRAINT CK_BBVA_PersonDocument_Type CHECK (DocumentType IN (N'CV')),
      CONSTRAINT CK_BBVA_PersonDocument_Size CHECK (FileSizeBytes > 0 AND FileSizeBytes <= 10485760)
    );
  END;

  IF OBJECT_ID(N'bbva.TalentHistory', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.TalentHistory (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_TalentHistory PRIMARY KEY DEFAULT NEWID(),
      TalentBankEntryId UNIQUEIDENTIFIER NOT NULL,
      EventType NVARCHAR(50) NOT NULL,
      Description NVARCHAR(500) NOT NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_TalentHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_TalentHistory_Entry FOREIGN KEY (TalentBankEntryId) REFERENCES bbva.TalentBankEntry(Id)
    );
  END;

  IF OBJECT_ID(N'bbva.Collaborator', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.Collaborator (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_Collaborator PRIMARY KEY DEFAULT NEWID(),
      PersonId UNIQUEIDENTIFIER NOT NULL,
      Status NVARCHAR(20) NOT NULL CONSTRAINT DF_BBVA_Collaborator_Status DEFAULT N'ACTIVE',
      StartDate DATE NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_Collaborator_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_Collaborator_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_Collaborator_Person FOREIGN KEY (PersonId) REFERENCES bbva.Person(Id),
      CONSTRAINT CK_BBVA_Collaborator_Status CHECK (Status IN (N'ACTIVE', N'INACTIVE'))
    );
  END;

  IF OBJECT_ID(N'bbva.CollaboratorHistory', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CollaboratorHistory (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CollaboratorHistory PRIMARY KEY DEFAULT NEWID(),
      CollaboratorId UNIQUEIDENTIFIER NOT NULL,
      EventType NVARCHAR(50) NOT NULL,
      Description NVARCHAR(500) NOT NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CollaboratorHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_CollaboratorHistory_Collaborator FOREIGN KEY (CollaboratorId) REFERENCES bbva.Collaborator(Id)
    );
  END;


  IF OBJECT_ID(N'bbva.LifecycleReasonCatalog', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.LifecycleReasonCatalog (
      Code NVARCHAR(40) NOT NULL CONSTRAINT PK_BBVA_LifecycleReasonCatalog PRIMARY KEY,
      Name NVARCHAR(120) NOT NULL,
      DefaultTalentStage NVARCHAR(30) NOT NULL,
      Status NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_LifecycleReasonCatalog_Status DEFAULT N'ACTIVE',
      SortOrder INT NOT NULL CONSTRAINT DF_BBVA_LifecycleReasonCatalog_SortOrder DEFAULT 100,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_LifecycleReasonCatalog_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_LifecycleReasonCatalog_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT CK_BBVA_LifecycleReasonCatalog_Stage CHECK (DefaultTalentStage IN (N'AVAILABLE', N'UNASSIGNED')),
      CONSTRAINT CK_BBVA_LifecycleReasonCatalog_Status CHECK (Status IN (N'ACTIVE', N'INACTIVE'))
    );
  END;


  IF OBJECT_ID(N'bbva.CollaboratorImportResolution', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CollaboratorImportResolution (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CollaboratorImportResolution PRIMARY KEY DEFAULT NEWID(),
      ResolutionKey NVARCHAR(96) NOT NULL,
      Decision NVARCHAR(24) NOT NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CollaboratorImportResolution_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CollaboratorImportResolution_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT CK_BBVA_CollaboratorImportResolution_Decision CHECK (Decision IN (N'APPLY_EXCEL',N'KEEP_CURRENT'))
    );
  END;

  IF OBJECT_ID(N'bbva.PersonLifecycleHistory', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.PersonLifecycleHistory (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_PersonLifecycleHistory PRIMARY KEY DEFAULT NEWID(),
      PersonId UNIQUEIDENTIFIER NOT NULL,
      EventType NVARCHAR(50) NOT NULL,
      FromState NVARCHAR(30) NULL,
      ToState NVARCHAR(30) NULL,
      ReasonCode NVARCHAR(40) NULL,
      EffectiveDate DATE NULL,
      Description NVARCHAR(500) NOT NULL,
      Notes NVARCHAR(1000) NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_PersonLifecycleHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_PersonLifecycleHistory_Person FOREIGN KEY (PersonId) REFERENCES bbva.Person(Id),
      CONSTRAINT FK_BBVA_PersonLifecycleHistory_Reason FOREIGN KEY (ReasonCode) REFERENCES bbva.LifecycleReasonCatalog(Code),
      CONSTRAINT CK_BBVA_PersonLifecycleHistory_FromState CHECK (FromState IS NULL OR FromState IN (N'TALENT_BANK', N'COLLABORATOR')),
      CONSTRAINT CK_BBVA_PersonLifecycleHistory_ToState CHECK (ToState IS NULL OR ToState IN (N'TALENT_BANK', N'COLLABORATOR'))
    );
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_CollaboratorImportResolution_Key' AND object_id=OBJECT_ID(N'bbva.CollaboratorImportResolution'))
    CREATE UNIQUE INDEX UX_BBVA_CollaboratorImportResolution_Key ON bbva.CollaboratorImportResolution(ResolutionKey);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_Person_Email' AND object_id=OBJECT_ID(N'bbva.Person'))
    CREATE UNIQUE INDEX UX_BBVA_Person_Email ON bbva.Person(Email);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_Person_SofttekCode' AND object_id=OBJECT_ID(N'bbva.Person'))
    CREATE UNIQUE INDEX UX_BBVA_Person_SofttekCode ON bbva.Person(SofttekCode) WHERE SofttekCode IS NOT NULL;
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_Person_CorporateUser' AND object_id=OBJECT_ID(N'bbva.Person'))
    CREATE UNIQUE INDEX UX_BBVA_Person_CorporateUser ON bbva.Person(CorporateUser) WHERE CorporateUser IS NOT NULL;
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_TalentBankEntry_Person' AND object_id=OBJECT_ID(N'bbva.TalentBankEntry'))
    CREATE UNIQUE INDEX UX_BBVA_TalentBankEntry_Person ON bbva.TalentBankEntry(PersonId);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_TalentBankEntry_LegacyTalentId' AND object_id=OBJECT_ID(N'bbva.TalentBankEntry'))
    CREATE UNIQUE INDEX UX_BBVA_TalentBankEntry_LegacyTalentId ON bbva.TalentBankEntry(LegacyTalentId) WHERE LegacyTalentId IS NOT NULL;
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_TalentBankEntry_Type_Stage' AND object_id=OBJECT_ID(N'bbva.TalentBankEntry'))
    CREATE INDEX IX_BBVA_TalentBankEntry_Type_Stage ON bbva.TalentBankEntry(TalentType, Stage, Active) INCLUDE (PersonId, UpdatedAt);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_PersonDocument_Person_Type' AND object_id=OBJECT_ID(N'bbva.PersonDocument'))
    CREATE UNIQUE INDEX UX_BBVA_PersonDocument_Person_Type ON bbva.PersonDocument(PersonId, DocumentType);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_TalentHistory_Entry_CreatedAt' AND object_id=OBJECT_ID(N'bbva.TalentHistory'))
    CREATE INDEX IX_BBVA_TalentHistory_Entry_CreatedAt ON bbva.TalentHistory(TalentBankEntryId, CreatedAt DESC);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_Collaborator_Person' AND object_id=OBJECT_ID(N'bbva.Collaborator'))
    CREATE UNIQUE INDEX UX_BBVA_Collaborator_Person ON bbva.Collaborator(PersonId);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_CollaboratorHistory_CreatedAt' AND object_id=OBJECT_ID(N'bbva.CollaboratorHistory'))
    CREATE INDEX IX_BBVA_CollaboratorHistory_CreatedAt ON bbva.CollaboratorHistory(CollaboratorId, CreatedAt DESC);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_PersonLifecycleHistory_Person_CreatedAt' AND object_id=OBJECT_ID(N'bbva.PersonLifecycleHistory'))
    CREATE INDEX IX_BBVA_PersonLifecycleHistory_Person_CreatedAt ON bbva.PersonLifecycleHistory(PersonId, CreatedAt DESC)
      INCLUDE (EventType, FromState, ToState, ReasonCode, EffectiveDate);

  DECLARE @LifecycleSeedActor NVARCHAR(255)=N'bbva-talent-init@local';
  MERGE bbva.LifecycleReasonCatalog AS target
  USING (VALUES
    (N'BBVA_EXIT', N'Baja de BBVA', N'UNASSIGNED', 10),
    (N'UNASSIGNED', N'Desasignación', N'UNASSIGNED', 20),
    (N'AVAILABLE', N'Disponible para asignación', N'AVAILABLE', 30),
    (N'OTHER', N'Otro', N'UNASSIGNED', 100)
  ) AS source(Code, Name, DefaultTalentStage, SortOrder)
  ON target.Code=source.Code
  WHEN MATCHED THEN UPDATE SET Name=source.Name, DefaultTalentStage=source.DefaultTalentStage, SortOrder=source.SortOrder, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@LifecycleSeedActor
  WHEN NOT MATCHED THEN INSERT (Code,Name,DefaultTalentStage,Status,SortOrder,CreatedByEmail,UpdatedByEmail)
    VALUES (source.Code,source.Name,source.DefaultTalentStage,N'ACTIVE',source.SortOrder,@LifecycleSeedActor,@LifecycleSeedActor);


  COMMIT TRANSACTION;
  PRINT N'Esquema BBVA Talent creado/verificado correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
