SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    EXEC(N'CREATE SCHEMA bbva AUTHORIZATION dbo;');

  IF OBJECT_ID(N'bbva.Person', N'U') IS NULL
    THROW 51000, N'No existe bbva.Person. Ejecuta primero la inicialización de BBVA Talent.', 1;

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

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name=N'IX_BBVA_PersonLifecycleHistory_Person_CreatedAt'
      AND object_id=OBJECT_ID(N'bbva.PersonLifecycleHistory')
  )
    CREATE INDEX IX_BBVA_PersonLifecycleHistory_Person_CreatedAt
      ON bbva.PersonLifecycleHistory(PersonId, CreatedAt DESC)
      INCLUDE (EventType, FromState, ToState, ReasonCode, EffectiveDate);

  DECLARE @SeedActor NVARCHAR(255)=N'bbva-lifecycle-migration@local';

  MERGE bbva.LifecycleReasonCatalog AS target
  USING (VALUES
    (N'BBVA_EXIT', N'Baja de BBVA', N'UNASSIGNED', 10),
    (N'UNASSIGNED', N'Desasignación', N'UNASSIGNED', 20),
    (N'AVAILABLE', N'Disponible para asignación', N'AVAILABLE', 30),
    (N'OTHER', N'Otro', N'UNASSIGNED', 100)
  ) AS source(Code, Name, DefaultTalentStage, SortOrder)
  ON target.Code=source.Code
  WHEN MATCHED THEN UPDATE SET
    Name=source.Name,
    DefaultTalentStage=source.DefaultTalentStage,
    SortOrder=source.SortOrder,
    UpdatedAt=SYSUTCDATETIME(),
    UpdatedByEmail=@SeedActor
  WHEN NOT MATCHED THEN
    INSERT (Code, Name, DefaultTalentStage, Status, SortOrder, CreatedByEmail, UpdatedByEmail)
    VALUES (source.Code, source.Name, source.DefaultTalentStage, N'ACTIVE', source.SortOrder, @SeedActor, @SeedActor);

  /* Backfill mínimo de hitos existentes. No reescribe los historiales operativos previos. */
  INSERT INTO bbva.PersonLifecycleHistory (
    PersonId, EventType, ToState, EffectiveDate, Description, CreatedAt, CreatedByEmail
  )
  SELECT
    t.PersonId,
    N'ENTERED_TALENT_BANK',
    N'TALENT_BANK',
    t.EntryDate,
    CASE t.TalentType
      WHEN N'ACADEMY' THEN N'La persona ingresó a Banco de talento como Academia.'
      WHEN N'PROSPECT' THEN N'La persona ingresó a Banco de talento como Prospecto.'
      ELSE N'La persona ingresó a Banco de talento procedente de Colaboradores.'
    END,
    t.CreatedAt,
    t.CreatedByEmail
  FROM bbva.TalentBankEntry t
  WHERE NOT EXISTS (
    SELECT 1 FROM bbva.PersonLifecycleHistory h
    WHERE h.PersonId=t.PersonId AND h.EventType=N'ENTERED_TALENT_BANK'
      AND ABS(DATEDIFF(SECOND,h.CreatedAt,t.CreatedAt)) <= 1
  );

  INSERT INTO bbva.PersonLifecycleHistory (
    PersonId, EventType, ToState, EffectiveDate, Description, CreatedAt, CreatedByEmail
  )
  SELECT
    c.PersonId,
    N'ENTERED_COLLABORATOR',
    N'COLLABORATOR',
    c.StartDate,
    N'La persona ingresó a Colaboradores.',
    c.CreatedAt,
    c.CreatedByEmail
  FROM bbva.Collaborator c
  WHERE NOT EXISTS (
    SELECT 1 FROM bbva.PersonLifecycleHistory h
    WHERE h.PersonId=c.PersonId AND h.EventType=N'ENTERED_COLLABORATOR'
      AND ABS(DATEDIFF(SECOND,h.CreatedAt,c.CreatedAt)) <= 1
  );

  INSERT INTO bbva.PersonLifecycleHistory (
    PersonId, EventType, FromState, ToState, EffectiveDate, Description, CreatedAt, CreatedByEmail
  )
  SELECT
    t.PersonId,
    N'TALENT_TO_COLLABORATOR',
    N'TALENT_BANK',
    N'COLLABORATOR',
    CONVERT(date,t.ConvertedAt),
    N'La persona pasó de Banco de talento a Colaboradores.',
    t.ConvertedAt,
    t.UpdatedByEmail
  FROM bbva.TalentBankEntry t
  WHERE t.ConvertedAt IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM bbva.PersonLifecycleHistory h
      WHERE h.PersonId=t.PersonId AND h.EventType=N'TALENT_TO_COLLABORATOR'
        AND ABS(DATEDIFF(SECOND,h.CreatedAt,t.ConvertedAt)) <= 1
    );

  COMMIT TRANSACTION;
  PRINT N'Ciclo de vida de personas BBVA configurado correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
