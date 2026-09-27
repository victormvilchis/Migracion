SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    THROW 51000, N'No existe el schema bbva.', 1;
  IF OBJECT_ID(N'bbva.Person', N'U') IS NULL
    THROW 51000, N'No existe bbva.Person.', 1;
  IF OBJECT_ID(N'bbva.PersonCertification', N'U') IS NULL
    THROW 51000, N'No existe bbva.PersonCertification.', 1;

  /* Identidad explícita: conservar columnas históricas por compatibilidad,
     pero separar correo Softtek, correo BBVA y usuario BBVA. */
  IF COL_LENGTH(N'bbva.Person', N'SofttekEmail') IS NULL
    ALTER TABLE bbva.Person ADD SofttekEmail NVARCHAR(255) NULL;
  IF COL_LENGTH(N'bbva.Person', N'BbvaEmail') IS NULL
    ALTER TABLE bbva.Person ADD BbvaEmail NVARCHAR(255) NULL;
  IF COL_LENGTH(N'bbva.Person', N'BbvaUser') IS NULL
    ALTER TABLE bbva.Person ADD BbvaUser NVARCHAR(100) NULL;

  EXEC sys.sp_executesql N'
    UPDATE bbva.Person
    SET SofttekEmail=COALESCE(SofttekEmail,Email),
        BbvaUser=COALESCE(BbvaUser,CorporateUser)
    WHERE SofttekEmail IS NULL OR BbvaUser IS NULL;
  ';

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'bbva.Person') AND name=N'UX_BBVA_Person_SofttekEmail'
  )
    EXEC(N'CREATE UNIQUE INDEX UX_BBVA_Person_SofttekEmail ON bbva.Person(SofttekEmail) WHERE SofttekEmail IS NOT NULL;');

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'bbva.Person') AND name=N'UX_BBVA_Person_BbvaEmail'
  )
    EXEC(N'CREATE UNIQUE INDEX UX_BBVA_Person_BbvaEmail ON bbva.Person(BbvaEmail) WHERE BbvaEmail IS NOT NULL;');

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'bbva.Person') AND name=N'UX_BBVA_Person_BbvaUser'
  )
    EXEC(N'CREATE UNIQUE INDEX UX_BBVA_Person_BbvaUser ON bbva.Person(BbvaUser) WHERE BbvaUser IS NOT NULL;');

  /* La programación futura no debe confundirse con la fecha real de aplicación. */
  IF COL_LENGTH(N'bbva.PersonCertification', N'NextScheduledDate') IS NULL
    ALTER TABLE bbva.PersonCertification ADD NextScheduledDate DATE NULL;

  EXEC sys.sp_executesql N'
    UPDATE bbva.PersonCertification
    SET NextScheduledDate=ApplicationDate
    WHERE NextScheduledDate IS NULL
      AND BaseStatus=N''SCHEDULED''
      AND ApplicationDate IS NOT NULL;
  ';

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'bbva.PersonCertification') AND name=N'IX_BBVA_PersonCertification_Tracking'
  )
    EXEC(N'CREATE INDEX IX_BBVA_PersonCertification_Tracking ON bbva.PersonCertification(Applicable,BaseStatus,NextScheduledDate,ExpirationDate) INCLUDE(PersonId,CertificationId,CurrentCycle,UpdatedAt);');

  COMMIT TRANSACTION;
  PRINT N'Migración V11 de identidad, paralelismo y seguimiento aplicada correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
