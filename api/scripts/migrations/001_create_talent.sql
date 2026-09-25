SET NOCOUNT ON;

IF DB_ID(N'bfs_local_db') IS NULL
BEGIN
  THROW 50001, 'La base bfs_local_db no existe. Ejecuta primero api/scripts/init-local-db.sql.', 1;
END;
GO

USE bfs_local_db;
GO

IF OBJECT_ID(N'dbo.Talent', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Talent (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Talent PRIMARY KEY DEFAULT NEWID(),
    FullName NVARCHAR(200) NOT NULL,
    Email NVARCHAR(255) NULL,
    Profile NVARCHAR(120) NULL,
    TechnologyProfile NVARCHAR(120) NULL,
    TargetTechnology NVARCHAR(120) NULL,
    Stage NVARCHAR(30) NOT NULL CONSTRAINT DF_Talent_Stage DEFAULT N'PROSPECT',
    Active BIT NOT NULL CONSTRAINT DF_Talent_Active DEFAULT 1,
    EntryDate DATE NOT NULL CONSTRAINT DF_Talent_EntryDate DEFAULT CONVERT(date, SYSUTCDATETIME()),
    Notes NVARCHAR(1000) NULL,
    ConvertedAt DATETIME2(3) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Talent_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Talent_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CreatedByEmail NVARCHAR(255) NOT NULL,
    UpdatedByEmail NVARCHAR(255) NOT NULL,
    CONSTRAINT CK_Talent_Stage CHECK (
      Stage IN (N'PROSPECT', N'ACADEMY', N'TRAINING', N'EVALUATION', N'AVAILABLE', N'UNASSIGNED', N'CONVERTED')
    )
  );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'UX_Talent_Email'
    AND object_id = OBJECT_ID(N'dbo.Talent')
)
BEGIN
  CREATE UNIQUE INDEX UX_Talent_Email
    ON dbo.Talent(Email)
    WHERE Email IS NOT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_Talent_Stage_Active'
    AND object_id = OBJECT_ID(N'dbo.Talent')
)
BEGIN
  CREATE INDEX IX_Talent_Stage_Active
    ON dbo.Talent(Stage, Active)
    INCLUDE (FullName, Email, TargetTechnology, UpdatedAt);
END;
GO

PRINT 'Migration 001_create_talent.sql aplicada correctamente.';
GO
