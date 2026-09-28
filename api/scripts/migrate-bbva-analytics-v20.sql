SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    THROW 51000, N'No existe el schema bbva.', 1;

  IF OBJECT_ID(N'bbva.DashboardMetricSnapshot', N'U') IS NULL
    THROW 51000, N'No existe bbva.DashboardMetricSnapshot. Ejecuta primero el checkpoint V19.', 1;

  IF OBJECT_ID(N'bbva.CollaboratorHistory', N'U') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.CollaboratorHistory') AND name=N'IX_BBVA_CollaboratorHistory_CreatedAt')
    CREATE INDEX IX_BBVA_CollaboratorHistory_CreatedAt
      ON bbva.CollaboratorHistory(CreatedAt DESC)
      INCLUDE (CollaboratorId,EventType,Description,CreatedByEmail);

  IF OBJECT_ID(N'bbva.TalentHistory', N'U') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.TalentHistory') AND name=N'IX_BBVA_TalentHistory_CreatedAt')
    CREATE INDEX IX_BBVA_TalentHistory_CreatedAt
      ON bbva.TalentHistory(CreatedAt DESC)
      INCLUDE (TalentBankEntryId,EventType,Description,CreatedByEmail);

  IF OBJECT_ID(N'bbva.PersonCertificationHistory', N'U') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.PersonCertificationHistory') AND name=N'IX_BBVA_PersonCertificationHistory_CreatedAt')
    CREATE INDEX IX_BBVA_PersonCertificationHistory_CreatedAt
      ON bbva.PersonCertificationHistory(CreatedAt DESC)
      INCLUDE (PersonCertificationId,EventType,Description,CreatedByEmail);

  COMMIT TRANSACTION;
  PRINT N'Analytics V20: índices de actividad e histórico listos.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
