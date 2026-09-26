SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_ID(N'bfs_local_db') IS NULL
BEGIN
  THROW 50003, 'La base bfs_local_db no existe. Ejecuta primero api/scripts/init-local-db.sql.', 1;
END;
GO

USE bfs_local_db;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Corrige/garantiza los índices de Talent Bank que pudieron no crearse en la migración 002.
IF OBJECT_ID(N'dbo.Person', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Person_Email' AND object_id=OBJECT_ID(N'dbo.Person'))
    CREATE UNIQUE INDEX UX_Person_Email ON dbo.Person(Email);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Person_SofttekCode' AND object_id=OBJECT_ID(N'dbo.Person'))
    CREATE UNIQUE INDEX UX_Person_SofttekCode ON dbo.Person(SofttekCode) WHERE SofttekCode IS NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Person_CorporateUser' AND object_id=OBJECT_ID(N'dbo.Person'))
    CREATE UNIQUE INDEX UX_Person_CorporateUser ON dbo.Person(CorporateUser) WHERE CorporateUser IS NOT NULL;
END;
GO

IF OBJECT_ID(N'dbo.TalentBankEntry', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_TalentBankEntry_Person' AND object_id=OBJECT_ID(N'dbo.TalentBankEntry'))
    CREATE UNIQUE INDEX UX_TalentBankEntry_Person ON dbo.TalentBankEntry(PersonId);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_TalentBankEntry_LegacyTalentId' AND object_id=OBJECT_ID(N'dbo.TalentBankEntry'))
    CREATE UNIQUE INDEX UX_TalentBankEntry_LegacyTalentId ON dbo.TalentBankEntry(LegacyTalentId) WHERE LegacyTalentId IS NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_TalentBankEntry_Type_Stage' AND object_id=OBJECT_ID(N'dbo.TalentBankEntry'))
    CREATE INDEX IX_TalentBankEntry_Type_Stage ON dbo.TalentBankEntry(TalentType, Stage, Active) INCLUDE (PersonId, UpdatedAt);
END;
GO

IF OBJECT_ID(N'dbo.PersonDocument', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_PersonDocument_Person_Type' AND object_id=OBJECT_ID(N'dbo.PersonDocument'))
    CREATE UNIQUE INDEX UX_PersonDocument_Person_Type ON dbo.PersonDocument(PersonId, DocumentType);
END;
GO

IF OBJECT_ID(N'dbo.TalentHistory', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_TalentHistory_Entry_CreatedAt' AND object_id=OBJECT_ID(N'dbo.TalentHistory'))
    CREATE INDEX IX_TalentHistory_Entry_CreatedAt ON dbo.TalentHistory(TalentBankEntryId, CreatedAt DESC);
END;
GO

-- Base mínima de Colaboradores requerida por la conversión Talent Bank -> Colaboradores.
IF OBJECT_ID(N'dbo.Collaborator', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Collaborator (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Collaborator PRIMARY KEY DEFAULT NEWID(),
    PersonId UNIQUEIDENTIFIER NOT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Collaborator_Status DEFAULT N'ACTIVE',
    StartDate DATE NULL,
    EndDate DATE NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Collaborator_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Collaborator_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CreatedByEmail NVARCHAR(255) NOT NULL,
    UpdatedByEmail NVARCHAR(255) NOT NULL,
    CONSTRAINT FK_Collaborator_Person FOREIGN KEY (PersonId) REFERENCES dbo.Person(Id),
    CONSTRAINT CK_Collaborator_Status CHECK (Status IN (N'ACTIVE', N'INACTIVE')),
    CONSTRAINT CK_Collaborator_Dates CHECK (EndDate IS NULL OR StartDate IS NULL OR EndDate >= StartDate)
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Collaborator_Person' AND object_id=OBJECT_ID(N'dbo.Collaborator'))
  CREATE UNIQUE INDEX UX_Collaborator_Person ON dbo.Collaborator(PersonId);
GO

IF OBJECT_ID(N'dbo.CollaboratorHistory', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CollaboratorHistory (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_CollaboratorHistory PRIMARY KEY DEFAULT NEWID(),
    CollaboratorId UNIQUEIDENTIFIER NOT NULL,
    EventType NVARCHAR(50) NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_CollaboratorHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedByEmail NVARCHAR(255) NOT NULL,
    CONSTRAINT FK_CollaboratorHistory_Collaborator FOREIGN KEY (CollaboratorId) REFERENCES dbo.Collaborator(Id)
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_CollaboratorHistory_CreatedAt' AND object_id=OBJECT_ID(N'dbo.CollaboratorHistory'))
  CREATE INDEX IX_CollaboratorHistory_CreatedAt ON dbo.CollaboratorHistory(CollaboratorId, CreatedAt DESC);
GO

PRINT 'Migration 003_talent_bank_nexoskill_alignment.sql aplicada correctamente.';
GO
