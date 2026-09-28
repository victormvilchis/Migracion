SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID(N'bbva.Person', N'U') IS NULL THROW 51000, N'No existe bbva.Person.', 1;
  IF OBJECT_ID(N'bbva.PersonCertification', N'U') IS NULL THROW 51000, N'No existe bbva.PersonCertification.', 1;
  IF OBJECT_ID(N'bbva.CertificationCatalog', N'U') IS NULL THROW 51000, N'No existe bbva.CertificationCatalog.', 1;

  IF COL_LENGTH(N'bbva.Person', N'OriginalFullName') IS NULL
    EXEC sys.sp_executesql N'ALTER TABLE bbva.Person ADD OriginalFullName NVARCHAR(300) NULL;';
  IF COL_LENGTH(N'bbva.Person', N'BbvaStructureLevel2') IS NULL
    EXEC sys.sp_executesql N'ALTER TABLE bbva.Person ADD BbvaStructureLevel2 NVARCHAR(220) NULL;';
  IF COL_LENGTH(N'bbva.Person', N'BbvaStructureLevel3') IS NULL
    EXEC sys.sp_executesql N'ALTER TABLE bbva.Person ADD BbvaStructureLevel3 NVARCHAR(220) NULL;';
  IF COL_LENGTH(N'bbva.Person', N'BbvaAccessEndDate') IS NULL
    EXEC sys.sp_executesql N'ALTER TABLE bbva.Person ADD BbvaAccessEndDate DATE NULL;';
  IF COL_LENGTH(N'bbva.Person', N'BbvaAccessAuthorizer') IS NULL
    EXEC sys.sp_executesql N'ALTER TABLE bbva.Person ADD BbvaAccessAuthorizer NVARCHAR(220) NULL;';
  IF COL_LENGTH(N'bbva.Person', N'BbvaAccessStatus') IS NULL
    EXEC sys.sp_executesql N'ALTER TABLE bbva.Person ADD BbvaAccessStatus NVARCHAR(100) NULL;';

  IF COL_LENGTH(N'bbva.PersonCertification', N'SofttekManagement') IS NULL
    EXEC sys.sp_executesql N'ALTER TABLE bbva.PersonCertification ADD SofttekManagement NVARCHAR(1500) NULL;';

  IF COL_LENGTH(N'bbva.CertificationCatalog', N'TracksScore') IS NULL
  BEGIN
    EXEC sys.sp_executesql N'ALTER TABLE bbva.CertificationCatalog ADD TracksScore BIT NOT NULL CONSTRAINT DF_BBVA_CertificationCatalog_TracksScore DEFAULT 0;';
    EXEC sys.sp_executesql N'UPDATE bbva.CertificationCatalog SET TracksScore=CASE WHEN CertificationType IN (N''TECHNOLOGICAL'',N''DEVELOPMENT_SECURITY'',N''NORMATIVE_TESTING'') THEN 1 ELSE 0 END;';
  END;

  IF OBJECT_ID(N'bbva.PersonFieldProvenance', N'U') IS NULL
  BEGIN
    EXEC sys.sp_executesql N'
      CREATE TABLE bbva.PersonFieldProvenance (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_PersonFieldProvenance PRIMARY KEY DEFAULT NEWID(),
        PersonId UNIQUEIDENTIFIER NOT NULL,
        FieldName NVARCHAR(80) NOT NULL,
        SourceType NVARCHAR(24) NOT NULL,
        SourceValue NVARCHAR(1500) NULL,
        SourceRowNumber INT NULL,
        FirstSeenAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_PersonFieldProvenance_FirstSeenAt DEFAULT SYSUTCDATETIME(),
        LastSeenAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_PersonFieldProvenance_LastSeenAt DEFAULT SYSUTCDATETIME(),
        CreatedByEmail NVARCHAR(255) NOT NULL,
        UpdatedByEmail NVARCHAR(255) NOT NULL,
        CONSTRAINT FK_BBVA_PersonFieldProvenance_Person FOREIGN KEY (PersonId) REFERENCES bbva.Person(Id),
        CONSTRAINT CK_BBVA_PersonFieldProvenance_Source CHECK (SourceType IN (N''MANUAL'',N''TABLERO'',N''HEADCOUNT'',N''IMPORT''))
      );
    ';
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.PersonFieldProvenance') AND name=N'UX_BBVA_PersonFieldProvenance_Field_Source')
    EXEC sys.sp_executesql N'CREATE UNIQUE INDEX UX_BBVA_PersonFieldProvenance_Field_Source ON bbva.PersonFieldProvenance(PersonId,FieldName,SourceType);';

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.PersonFieldProvenance') AND name=N'IX_BBVA_PersonFieldProvenance_Person')
    EXEC sys.sp_executesql N'CREATE INDEX IX_BBVA_PersonFieldProvenance_Person ON bbva.PersonFieldProvenance(PersonId,LastSeenAt DESC);';

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
