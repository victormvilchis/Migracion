SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    EXEC(N'CREATE SCHEMA bbva AUTHORIZATION dbo;');

  IF OBJECT_ID(N'bbva.CatalogCategory', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CatalogCategory (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CatalogCategory PRIMARY KEY DEFAULT NEWID(),
      Name NVARCHAR(180) NOT NULL,
      Description NVARCHAR(500) NULL,
      Seniority NVARCHAR(40) NULL,
      Status NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_CatalogCategory_Status DEFAULT N'ACTIVE',
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CatalogCategory_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CatalogCategory_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT CK_BBVA_CatalogCategory_Status CHECK (Status IN (N'ACTIVE', N'INACTIVE'))
    );
  END;

  IF OBJECT_ID(N'bbva.CatalogTechnology', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CatalogTechnology (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CatalogTechnology PRIMARY KEY DEFAULT NEWID(),
      Name NVARCHAR(180) NOT NULL,
      Description NVARCHAR(500) NULL,
      Seniority NVARCHAR(40) NULL,
      Status NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_CatalogTechnology_Status DEFAULT N'ACTIVE',
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CatalogTechnology_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CatalogTechnology_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT CK_BBVA_CatalogTechnology_Status CHECK (Status IN (N'ACTIVE', N'INACTIVE'))
    );
  END;

  IF OBJECT_ID(N'bbva.CatalogProfile', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CatalogProfile (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CatalogProfile PRIMARY KEY DEFAULT NEWID(),
      Name NVARCHAR(180) NOT NULL,
      Description NVARCHAR(500) NULL,
      Seniority NVARCHAR(40) NULL,
      Status NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_CatalogProfile_Status DEFAULT N'ACTIVE',
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CatalogProfile_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CatalogProfile_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT CK_BBVA_CatalogProfile_Status CHECK (Status IN (N'ACTIVE', N'INACTIVE'))
    );
  END;

  IF OBJECT_ID(N'bbva.CatalogTechnologyProfile', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CatalogTechnologyProfile (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CatalogTechnologyProfile PRIMARY KEY DEFAULT NEWID(),
      Name NVARCHAR(180) NOT NULL,
      Description NVARCHAR(500) NULL,
      Seniority NVARCHAR(40) NULL,
      Status NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_CatalogTechnologyProfile_Status DEFAULT N'ACTIVE',
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CatalogTechnologyProfile_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CatalogTechnologyProfile_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT CK_BBVA_CatalogTechnologyProfile_Status CHECK (Status IN (N'ACTIVE', N'INACTIVE'))
    );
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_CatalogCategory_Name' AND object_id=OBJECT_ID(N'bbva.CatalogCategory'))
    CREATE UNIQUE INDEX UX_BBVA_CatalogCategory_Name ON bbva.CatalogCategory(Name);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_CatalogCategory_Status_Name' AND object_id=OBJECT_ID(N'bbva.CatalogCategory'))
    CREATE INDEX IX_BBVA_CatalogCategory_Status_Name ON bbva.CatalogCategory(Status, Name) INCLUDE (UpdatedAt);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_CatalogTechnology_Name' AND object_id=OBJECT_ID(N'bbva.CatalogTechnology'))
    CREATE UNIQUE INDEX UX_BBVA_CatalogTechnology_Name ON bbva.CatalogTechnology(Name);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_CatalogTechnology_Status_Name' AND object_id=OBJECT_ID(N'bbva.CatalogTechnology'))
    CREATE INDEX IX_BBVA_CatalogTechnology_Status_Name ON bbva.CatalogTechnology(Status, Name) INCLUDE (UpdatedAt);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_CatalogProfile_Name' AND object_id=OBJECT_ID(N'bbva.CatalogProfile'))
    CREATE UNIQUE INDEX UX_BBVA_CatalogProfile_Name ON bbva.CatalogProfile(Name);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_CatalogProfile_Status_Name' AND object_id=OBJECT_ID(N'bbva.CatalogProfile'))
    CREATE INDEX IX_BBVA_CatalogProfile_Status_Name ON bbva.CatalogProfile(Status, Name) INCLUDE (UpdatedAt, Seniority);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_CatalogTechnologyProfile_Name' AND object_id=OBJECT_ID(N'bbva.CatalogTechnologyProfile'))
    CREATE UNIQUE INDEX UX_BBVA_CatalogTechnologyProfile_Name ON bbva.CatalogTechnologyProfile(Name);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_BBVA_CatalogTechnologyProfile_Status_Name' AND object_id=OBJECT_ID(N'bbva.CatalogTechnologyProfile'))
    CREATE INDEX IX_BBVA_CatalogTechnologyProfile_Status_Name ON bbva.CatalogTechnologyProfile(Status, Name) INCLUDE (UpdatedAt);

  -- Semillas funcionales equivalentes a los catálogos usados actualmente por BBVA Workspace.
  DECLARE @SeedActor NVARCHAR(255) = N'system@softtek.com';

  IF NOT EXISTS (SELECT 1 FROM bbva.CatalogCategory)
  BEGIN
    INSERT INTO bbva.CatalogCategory (Name, Description, CreatedByEmail, UpdatedByEmail)
    VALUES
      (N'APX', N'Preguntas y contenidos relacionados con APX.', @SeedActor, @SeedActor),
      (N'JAVA', N'Preguntas y contenidos relacionados con Java.', @SeedActor, @SeedActor);
  END;

  DECLARE @Technologies TABLE (Name NVARCHAR(180));
  INSERT INTO @Technologies (Name) VALUES
    (N'APX'), (N'ASO'), (N'CELLS'), (N'DATIO'), (N'HOST'), (N'IPC ETL'),
    (N'JAVA'), (N'LRBA'), (N'ORACLE'), (N'POWER BUILDER'), (N'SALESFORCE');

  IF OBJECT_ID(N'bbva.Person', N'U') IS NOT NULL
    INSERT INTO @Technologies (Name)
      SELECT DISTINCT LTRIM(RTRIM(p.CurrentTechnology))
      FROM bbva.Person p
      WHERE NULLIF(LTRIM(RTRIM(p.CurrentTechnology)), N'') IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM @Technologies x WHERE UPPER(x.Name)=UPPER(LTRIM(RTRIM(p.CurrentTechnology))));

  INSERT INTO bbva.CatalogTechnology (Name, CreatedByEmail, UpdatedByEmail)
    SELECT t.Name, @SeedActor, @SeedActor
    FROM @Technologies t
    WHERE NOT EXISTS (SELECT 1 FROM bbva.CatalogTechnology c WHERE UPPER(c.Name)=UPPER(t.Name));

  DECLARE @Profiles TABLE (Name NVARCHAR(180), Seniority NVARCHAR(40));
  INSERT INTO @Profiles (Name, Seniority) VALUES
    (N'ANALISTA PROGRAMADOR JR COMMODITY', N'JR'),
    (N'ANALISTA PROGRAMADOR JR ESPECIAL', N'JR'),
    (N'ANALISTA PROGRAMADOR STD COMMODITY', N'STD'),
    (N'ANALISTA PROGRAMADOR STD ESPECIAL', N'STD'),
    (N'ANALISTA PROGRAMADOR SR COMMODITY', N'SR'),
    (N'ANALISTA PROGRAMADOR SR ESPECIAL', N'SR'),
    (N'ANALISTA FUNCIONAL ORGANICO STD COMMODITY', N'STD'),
    (N'ANALISTA FUNCIONAL ORGANICO SR COMMODITY', N'SR'),
    (N'DATA ENGINEER JR ESPECIAL', N'JR');

  IF OBJECT_ID(N'bbva.Person', N'U') IS NOT NULL
    INSERT INTO @Profiles (Name, Seniority)
      SELECT DISTINCT LTRIM(RTRIM(p.Profile)), NULL
      FROM bbva.Person p
      WHERE NULLIF(LTRIM(RTRIM(p.Profile)), N'') IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM @Profiles x WHERE UPPER(x.Name)=UPPER(LTRIM(RTRIM(p.Profile))));

  INSERT INTO bbva.CatalogProfile (Name, Seniority, CreatedByEmail, UpdatedByEmail)
    SELECT p.Name, p.Seniority, @SeedActor, @SeedActor
    FROM @Profiles p
    WHERE NOT EXISTS (SELECT 1 FROM bbva.CatalogProfile c WHERE UPPER(c.Name)=UPPER(p.Name));

  DECLARE @TechnologyProfiles TABLE (Name NVARCHAR(180));
  INSERT INTO @TechnologyProfiles (Name) VALUES (N'DESARROLLADOR'), (N'FUNCIONAL'), (N'PLATAFORMA ESPECIALIZADA');

  IF OBJECT_ID(N'bbva.Person', N'U') IS NOT NULL
    INSERT INTO @TechnologyProfiles (Name)
      SELECT DISTINCT LTRIM(RTRIM(p.TechnologyProfile))
      FROM bbva.Person p
      WHERE NULLIF(LTRIM(RTRIM(p.TechnologyProfile)), N'') IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM @TechnologyProfiles x WHERE UPPER(x.Name)=UPPER(LTRIM(RTRIM(p.TechnologyProfile))));

  INSERT INTO bbva.CatalogTechnologyProfile (Name, CreatedByEmail, UpdatedByEmail)
    SELECT p.Name, @SeedActor, @SeedActor
    FROM @TechnologyProfiles p
    WHERE NOT EXISTS (SELECT 1 FROM bbva.CatalogTechnologyProfile c WHERE UPPER(c.Name)=UPPER(p.Name));

  COMMIT TRANSACTION;
  PRINT N'Catálogos BBVA creados/verificados correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
