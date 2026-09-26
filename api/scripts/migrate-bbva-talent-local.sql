SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    EXEC(N'CREATE SCHEMA bbva AUTHORIZATION dbo;');

  IF OBJECT_ID(N'bbva.Person', N'U') IS NULL AND OBJECT_ID(N'dbo.Person', N'U') IS NOT NULL
    ALTER SCHEMA bbva TRANSFER dbo.Person;

  IF OBJECT_ID(N'bbva.TalentBankEntry', N'U') IS NULL AND OBJECT_ID(N'dbo.TalentBankEntry', N'U') IS NOT NULL
    ALTER SCHEMA bbva TRANSFER dbo.TalentBankEntry;

  IF OBJECT_ID(N'bbva.PersonDocument', N'U') IS NULL AND OBJECT_ID(N'dbo.PersonDocument', N'U') IS NOT NULL
    ALTER SCHEMA bbva TRANSFER dbo.PersonDocument;

  IF OBJECT_ID(N'bbva.TalentHistory', N'U') IS NULL AND OBJECT_ID(N'dbo.TalentHistory', N'U') IS NOT NULL
    ALTER SCHEMA bbva TRANSFER dbo.TalentHistory;

  IF OBJECT_ID(N'bbva.Collaborator', N'U') IS NULL AND OBJECT_ID(N'dbo.Collaborator', N'U') IS NOT NULL
    ALTER SCHEMA bbva TRANSFER dbo.Collaborator;

  IF OBJECT_ID(N'bbva.CollaboratorHistory', N'U') IS NULL AND OBJECT_ID(N'dbo.CollaboratorHistory', N'U') IS NOT NULL
    ALTER SCHEMA bbva TRANSFER dbo.CollaboratorHistory;

  -- Homologa nombres de índices creados por versiones locales anteriores.
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.Person') AND name=N'UX_Person_Email')
    EXEC sp_rename N'bbva.Person.UX_Person_Email', N'UX_BBVA_Person_Email', N'INDEX';
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.Person') AND name=N'UX_Person_SofttekCode')
    EXEC sp_rename N'bbva.Person.UX_Person_SofttekCode', N'UX_BBVA_Person_SofttekCode', N'INDEX';
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.Person') AND name=N'UX_Person_CorporateUser')
    EXEC sp_rename N'bbva.Person.UX_Person_CorporateUser', N'UX_BBVA_Person_CorporateUser', N'INDEX';
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.TalentBankEntry') AND name=N'UX_TalentBankEntry_Person')
    EXEC sp_rename N'bbva.TalentBankEntry.UX_TalentBankEntry_Person', N'UX_BBVA_TalentBankEntry_Person', N'INDEX';
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.TalentBankEntry') AND name=N'UX_TalentBankEntry_LegacyTalentId')
    EXEC sp_rename N'bbva.TalentBankEntry.UX_TalentBankEntry_LegacyTalentId', N'UX_BBVA_TalentBankEntry_LegacyTalentId', N'INDEX';
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.TalentBankEntry') AND name=N'IX_TalentBankEntry_Type_Stage')
    EXEC sp_rename N'bbva.TalentBankEntry.IX_TalentBankEntry_Type_Stage', N'IX_BBVA_TalentBankEntry_Type_Stage', N'INDEX';
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.PersonDocument') AND name=N'UX_PersonDocument_Person_Type')
    EXEC sp_rename N'bbva.PersonDocument.UX_PersonDocument_Person_Type', N'UX_BBVA_PersonDocument_Person_Type', N'INDEX';
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.TalentHistory') AND name=N'IX_TalentHistory_Entry_CreatedAt')
    EXEC sp_rename N'bbva.TalentHistory.IX_TalentHistory_Entry_CreatedAt', N'IX_BBVA_TalentHistory_Entry_CreatedAt', N'INDEX';
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.Collaborator') AND name=N'UX_Collaborator_Person')
    EXEC sp_rename N'bbva.Collaborator.UX_Collaborator_Person', N'UX_BBVA_Collaborator_Person', N'INDEX';
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.CollaboratorHistory') AND name=N'IX_CollaboratorHistory_CreatedAt')
    EXEC sp_rename N'bbva.CollaboratorHistory.IX_CollaboratorHistory_CreatedAt', N'IX_BBVA_CollaboratorHistory_CreatedAt', N'INDEX';

  COMMIT TRANSACTION;
  PRINT N'Tablas locales BBVA movidas al schema bbva sin pérdida de datos.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
