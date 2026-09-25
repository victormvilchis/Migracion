SET NOCOUNT ON;

IF DB_ID(N'bfs_local_db') IS NULL
BEGIN
  THROW 50002, 'La base bfs_local_db no existe. Ejecuta primero api/scripts/init-local-db.sql.', 1;
END;
GO

USE bfs_local_db;
GO

IF OBJECT_ID(N'dbo.Person', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Person (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Person PRIMARY KEY DEFAULT NEWID(),
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
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Person_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Person_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CreatedByEmail NVARCHAR(255) NOT NULL,
    UpdatedByEmail NVARCHAR(255) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.TalentBankEntry', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.TalentBankEntry (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TalentBankEntry PRIMARY KEY DEFAULT NEWID(),
    PersonId UNIQUEIDENTIFIER NOT NULL,
    LegacyTalentId UNIQUEIDENTIFIER NULL,
    TalentType NVARCHAR(30) NOT NULL,
    Stage NVARCHAR(30) NOT NULL,
    Active BIT NOT NULL CONSTRAINT DF_TalentBankEntry_Active DEFAULT 1,
    PlatformStartDate DATE NULL,
    PlatformEndDate DATE NULL,
    EntryDate DATE NOT NULL CONSTRAINT DF_TalentBankEntry_EntryDate DEFAULT CONVERT(date, SYSUTCDATETIME()),
    ConvertedAt DATETIME2(3) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_TalentBankEntry_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_TalentBankEntry_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CreatedByEmail NVARCHAR(255) NOT NULL,
    UpdatedByEmail NVARCHAR(255) NOT NULL,
    CONSTRAINT FK_TalentBankEntry_Person FOREIGN KEY (PersonId) REFERENCES dbo.Person(Id),
    CONSTRAINT CK_TalentBankEntry_Type CHECK (TalentType IN (N'ACADEMY', N'PROSPECT', N'BBVA_EXIT')),
    CONSTRAINT CK_TalentBankEntry_Stage CHECK (Stage IN (N'REGISTERED', N'ACADEMY', N'TRAINING', N'EVALUATION', N'AVAILABLE', N'UNASSIGNED', N'CONVERTED')),
    CONSTRAINT CK_TalentBankEntry_Dates CHECK (PlatformEndDate IS NULL OR PlatformStartDate IS NULL OR PlatformEndDate >= PlatformStartDate)
  );
END;
GO

IF OBJECT_ID(N'dbo.PersonDocument', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PersonDocument (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_PersonDocument PRIMARY KEY DEFAULT NEWID(),
    PersonId UNIQUEIDENTIFIER NOT NULL,
    DocumentType NVARCHAR(30) NOT NULL,
    FileName NVARCHAR(255) NOT NULL,
    ContentType NVARCHAR(150) NOT NULL,
    FileExtension NVARCHAR(10) NOT NULL,
    FileSizeBytes INT NOT NULL,
    FileContent VARBINARY(MAX) NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_PersonDocument_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_PersonDocument_UpdatedAt DEFAULT SYSUTCDATETIME(),
    UploadedByEmail NVARCHAR(255) NOT NULL,
    CONSTRAINT FK_PersonDocument_Person FOREIGN KEY (PersonId) REFERENCES dbo.Person(Id),
    CONSTRAINT CK_PersonDocument_Type CHECK (DocumentType IN (N'CV')),
    CONSTRAINT CK_PersonDocument_Size CHECK (FileSizeBytes > 0 AND FileSizeBytes <= 10485760)
  );
END;
GO

IF OBJECT_ID(N'dbo.TalentHistory', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.TalentHistory (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TalentHistory PRIMARY KEY DEFAULT NEWID(),
    TalentBankEntryId UNIQUEIDENTIFIER NOT NULL,
    EventType NVARCHAR(50) NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_TalentHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedByEmail NVARCHAR(255) NOT NULL,
    CONSTRAINT FK_TalentHistory_Entry FOREIGN KEY (TalentBankEntryId) REFERENCES dbo.TalentBankEntry(Id)
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Person_Email' AND object_id=OBJECT_ID(N'dbo.Person'))
  CREATE UNIQUE INDEX UX_Person_Email ON dbo.Person(Email);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Person_SofttekCode' AND object_id=OBJECT_ID(N'dbo.Person'))
  CREATE UNIQUE INDEX UX_Person_SofttekCode ON dbo.Person(SofttekCode) WHERE SofttekCode IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Person_CorporateUser' AND object_id=OBJECT_ID(N'dbo.Person'))
  CREATE UNIQUE INDEX UX_Person_CorporateUser ON dbo.Person(CorporateUser) WHERE CorporateUser IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_TalentBankEntry_Person' AND object_id=OBJECT_ID(N'dbo.TalentBankEntry'))
  CREATE UNIQUE INDEX UX_TalentBankEntry_Person ON dbo.TalentBankEntry(PersonId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_TalentBankEntry_LegacyTalentId' AND object_id=OBJECT_ID(N'dbo.TalentBankEntry'))
  CREATE UNIQUE INDEX UX_TalentBankEntry_LegacyTalentId ON dbo.TalentBankEntry(LegacyTalentId) WHERE LegacyTalentId IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_TalentBankEntry_Type_Stage' AND object_id=OBJECT_ID(N'dbo.TalentBankEntry'))
  CREATE INDEX IX_TalentBankEntry_Type_Stage ON dbo.TalentBankEntry(TalentType, Stage, Active) INCLUDE (PersonId, UpdatedAt);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_PersonDocument_Person_Type' AND object_id=OBJECT_ID(N'dbo.PersonDocument'))
  CREATE UNIQUE INDEX UX_PersonDocument_Person_Type ON dbo.PersonDocument(PersonId, DocumentType);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_TalentHistory_Entry_CreatedAt' AND object_id=OBJECT_ID(N'dbo.TalentHistory'))
  CREATE INDEX IX_TalentHistory_Entry_CreatedAt ON dbo.TalentHistory(TalentBankEntryId, CreatedAt DESC);
GO

-- Migra los registros creados por Talent v1 sin perder información.
IF OBJECT_ID(N'dbo.Talent', N'U') IS NOT NULL
BEGIN
  DECLARE @Map TABLE (LegacyTalentId UNIQUEIDENTIFIER NOT NULL, PersonId UNIQUEIDENTIFIER NOT NULL);

  MERGE dbo.Person AS target
  USING (
    SELECT t.*
    FROM dbo.Talent t
    WHERE NOT EXISTS (SELECT 1 FROM dbo.TalentBankEntry e WHERE e.LegacyTalentId=t.Id)
  ) AS source
  ON 1=0
  WHEN NOT MATCHED THEN
    INSERT (SofttekCode, CorporateUser, Email, FirstName, LastName, Profile, TechnologyProfile, CurrentTechnology, Expertise, HireDate, Notes, CreatedAt, UpdatedAt, CreatedByEmail, UpdatedByEmail)
    VALUES (NULL, NULL, COALESCE(NULLIF(source.Email, N''), CONCAT(N'legacy-', CONVERT(NVARCHAR(36), source.Id), N'@local.invalid')), source.FullName, NULL,
            source.Profile, source.TechnologyProfile, source.TargetTechnology, NULL, NULL, source.Notes,
            source.CreatedAt, source.UpdatedAt, source.CreatedByEmail, source.UpdatedByEmail)
  OUTPUT source.Id, inserted.Id INTO @Map(LegacyTalentId, PersonId);

  INSERT INTO dbo.TalentBankEntry (
    PersonId, LegacyTalentId, TalentType, Stage, Active, PlatformStartDate, PlatformEndDate, EntryDate,
    ConvertedAt, CreatedAt, UpdatedAt, CreatedByEmail, UpdatedByEmail
  )
  SELECT
    m.PersonId,
    t.Id,
    CASE WHEN t.Stage IN (N'ACADEMY', N'TRAINING', N'EVALUATION') THEN N'ACADEMY' ELSE N'PROSPECT' END,
    CASE WHEN t.Stage=N'PROSPECT' THEN N'REGISTERED' ELSE t.Stage END,
    t.Active,
    t.EntryDate,
    NULL,
    t.EntryDate,
    t.ConvertedAt,
    t.CreatedAt,
    t.UpdatedAt,
    t.CreatedByEmail,
    t.UpdatedByEmail
  FROM @Map m
  INNER JOIN dbo.Talent t ON t.Id=m.LegacyTalentId;

  INSERT INTO dbo.TalentHistory (TalentBankEntryId, EventType, Description, CreatedAt, CreatedByEmail)
  SELECT
    e.Id,
    N'CREATED',
    CASE WHEN e.TalentType=N'ACADEMY' THEN N'El talento fue registrado como integrante de Academia.' ELSE N'El prospecto fue registrado en Talent Bank.' END,
    e.CreatedAt,
    e.CreatedByEmail
  FROM dbo.TalentBankEntry e
  INNER JOIN @Map m ON m.LegacyTalentId=e.LegacyTalentId
  WHERE NOT EXISTS (SELECT 1 FROM dbo.TalentHistory h WHERE h.TalentBankEntryId=e.Id);
END;
GO

PRINT 'Migration 002_talent_bank_domain.sql aplicada correctamente.';
GO
