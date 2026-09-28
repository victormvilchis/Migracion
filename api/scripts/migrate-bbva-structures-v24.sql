SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  IF SCHEMA_ID(N'bbva') IS NULL EXEC(N'CREATE SCHEMA bbva');

  IF OBJECT_ID(N'bbva.StructureCatalog',N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.StructureCatalog(
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_StructureCatalog PRIMARY KEY DEFAULT NEWID(),
      LevelCode TINYINT NOT NULL,
      ParentId UNIQUEIDENTIFIER NULL,
      Name NVARCHAR(220) NOT NULL,
      Description NVARCHAR(500) NULL,
      Status NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_StructureCatalog_Status DEFAULT N'ACTIVE',
      CreatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_BBVA_StructureCatalog_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_BBVA_StructureCatalog_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(320) NOT NULL,
      UpdatedByEmail NVARCHAR(320) NOT NULL,
      CONSTRAINT FK_BBVA_StructureCatalog_Parent FOREIGN KEY(ParentId) REFERENCES bbva.StructureCatalog(Id),
      CONSTRAINT CK_BBVA_StructureCatalog_Level CHECK ((LevelCode=2 AND ParentId IS NULL) OR (LevelCode=3 AND ParentId IS NOT NULL)),
      CONSTRAINT CK_BBVA_StructureCatalog_Status CHECK (Status IN(N'ACTIVE',N'INACTIVE'))
    );
    CREATE UNIQUE INDEX UX_BBVA_StructureCatalog_LevelParentName ON bbva.StructureCatalog(LevelCode,ParentId,Name);
    CREATE INDEX IX_BBVA_StructureCatalog_StatusLevel ON bbva.StructureCatalog(Status,LevelCode,Name);
  END;

  IF OBJECT_ID(N'bbva.Person',N'U') IS NOT NULL
  BEGIN
    INSERT INTO bbva.StructureCatalog(LevelCode,ParentId,Name,Description,Status,CreatedByEmail,UpdatedByEmail)
    SELECT 2,NULL,x.Name,N'Importada desde información BBVA existente.',N'ACTIVE',N'system.structure-catalog@basebfs.local',N'system.structure-catalog@basebfs.local'
    FROM (SELECT DISTINCT LTRIM(RTRIM(BbvaStructureLevel2)) Name FROM bbva.Person WHERE NULLIF(LTRIM(RTRIM(BbvaStructureLevel2)),N'') IS NOT NULL) x
    WHERE NOT EXISTS(SELECT 1 FROM bbva.StructureCatalog s WHERE s.LevelCode=2 AND UPPER(LTRIM(RTRIM(s.Name)))=UPPER(x.Name));

    INSERT INTO bbva.StructureCatalog(LevelCode,ParentId,Name,Description,Status,CreatedByEmail,UpdatedByEmail)
    SELECT 3,parent.Id,x.Level3,N'Importada desde información BBVA existente.',N'ACTIVE',N'system.structure-catalog@basebfs.local',N'system.structure-catalog@basebfs.local'
    FROM (SELECT DISTINCT LTRIM(RTRIM(BbvaStructureLevel2)) Level2,LTRIM(RTRIM(BbvaStructureLevel3)) Level3 FROM bbva.Person WHERE NULLIF(LTRIM(RTRIM(BbvaStructureLevel2)),N'') IS NOT NULL AND NULLIF(LTRIM(RTRIM(BbvaStructureLevel3)),N'') IS NOT NULL) x
    INNER JOIN bbva.StructureCatalog parent ON parent.LevelCode=2 AND UPPER(LTRIM(RTRIM(parent.Name)))=UPPER(x.Level2)
    WHERE NOT EXISTS(SELECT 1 FROM bbva.StructureCatalog s WHERE s.LevelCode=3 AND s.ParentId=parent.Id AND UPPER(LTRIM(RTRIM(s.Name)))=UPPER(x.Level3));
  END;
  COMMIT;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK;
  THROW;
END CATCH;
