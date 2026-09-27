SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL THROW 51000, N'No existe el schema bbva.', 1;
  IF OBJECT_ID(N'bbva.CertificationCatalog', N'U') IS NULL THROW 51000, N'No existe bbva.CertificationCatalog.', 1;
  IF OBJECT_ID(N'bbva.PersonCertification', N'U') IS NULL THROW 51000, N'No existe bbva.PersonCertification.', 1;
  IF OBJECT_ID(N'bbva.PersonCertificationAttempt', N'U') IS NULL THROW 51000, N'No existe bbva.PersonCertificationAttempt.', 1;

  /* Máximo explícito por certificación. NULL = el catálogo todavía no define un límite. */
  IF COL_LENGTH(N'bbva.CertificationCatalog', N'MaxAttempts') IS NULL
    ALTER TABLE bbva.CertificationCatalog ADD MaxAttempts INT NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_BBVA_CertificationCatalog_MaxAttempts')
    EXEC(N'ALTER TABLE bbva.CertificationCatalog ADD CONSTRAINT CK_BBVA_CertificationCatalog_MaxAttempts CHECK (MaxAttempts IS NULL OR MaxAttempts > 0);');

  IF OBJECT_ID(N'bbva.CertificationPostcardTemplate', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CertificationPostcardTemplate (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CertificationPostcardTemplate PRIMARY KEY DEFAULT NEWID(),
      CertificationId UNIQUEIDENTIFIER NULL,
      Context NVARCHAR(32) NOT NULL,
      Version INT NOT NULL,
      Name NVARCHAR(160) NOT NULL,
      EyebrowTemplate NVARCHAR(180) NULL,
      TitleTemplate NVARCHAR(300) NOT NULL,
      MessageTemplate NVARCHAR(1000) NOT NULL,
      Accent NVARCHAR(16) NULL,
      Active BIT NOT NULL CONSTRAINT DF_BBVA_CertificationPostcardTemplate_Active DEFAULT 1,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CertificationPostcardTemplate_CreatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_CertificationPostcardTemplate_Certification FOREIGN KEY (CertificationId) REFERENCES bbva.CertificationCatalog(Id),
      CONSTRAINT CK_BBVA_CertificationPostcardTemplate_Context CHECK (Context IN (N'APPROVED',N'FIRST_FAILED',N'INTERMEDIATE_FAILED',N'LAST_FAILED',N'LOW',N'DEFAULT')),
      CONSTRAINT CK_BBVA_CertificationPostcardTemplate_Version CHECK (Version > 0)
    );
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.CertificationPostcardTemplate') AND name=N'UX_BBVA_PostcardTemplate_Key')
    CREATE UNIQUE INDEX UX_BBVA_PostcardTemplate_Key ON bbva.CertificationPostcardTemplate(CertificationId,Context,Version);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.CertificationPostcardTemplate') AND name=N'IX_BBVA_PostcardTemplate_Resolve')
    CREATE INDEX IX_BBVA_PostcardTemplate_Resolve ON bbva.CertificationPostcardTemplate(Context,Active,CertificationId,Version DESC);

  IF OBJECT_ID(N'bbva.CertificationEmailTemplate', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CertificationEmailTemplate (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CertificationEmailTemplate PRIMARY KEY DEFAULT NEWID(),
      CertificationId UNIQUEIDENTIFIER NULL,
      Context NVARCHAR(32) NOT NULL,
      Version INT NOT NULL,
      SubjectTemplate NVARCHAR(300) NOT NULL,
      BodyTemplate NVARCHAR(MAX) NOT NULL,
      Active BIT NOT NULL CONSTRAINT DF_BBVA_CertificationEmailTemplate_Active DEFAULT 1,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CertificationEmailTemplate_CreatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_CertificationEmailTemplate_Certification FOREIGN KEY (CertificationId) REFERENCES bbva.CertificationCatalog(Id),
      CONSTRAINT CK_BBVA_CertificationEmailTemplate_Context CHECK (Context IN (N'APPROVED',N'FIRST_FAILED',N'INTERMEDIATE_FAILED',N'LAST_FAILED',N'LOW',N'DEFAULT')),
      CONSTRAINT CK_BBVA_CertificationEmailTemplate_Version CHECK (Version > 0)
    );
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.CertificationEmailTemplate') AND name=N'UX_BBVA_EmailTemplate_Key')
    CREATE UNIQUE INDEX UX_BBVA_EmailTemplate_Key ON bbva.CertificationEmailTemplate(CertificationId,Context,Version);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.CertificationEmailTemplate') AND name=N'IX_BBVA_EmailTemplate_Resolve')
    CREATE INDEX IX_BBVA_EmailTemplate_Resolve ON bbva.CertificationEmailTemplate(Context,Active,CertificationId,Version DESC);

  IF OBJECT_ID(N'bbva.CertificationCommunication', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CertificationCommunication (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CertificationCommunication PRIMARY KEY DEFAULT NEWID(),
      PersonCertificationId UNIQUEIDENTIFIER NOT NULL,
      AttemptId UNIQUEIDENTIFIER NULL,
      CycleNumber INT NOT NULL,
      Context NVARCHAR(32) NOT NULL,
      PostcardTemplateId UNIQUEIDENTIFIER NOT NULL,
      PostcardTemplateVersion INT NOT NULL,
      PngData VARBINARY(MAX) NOT NULL,
      RecipientEmail NVARCHAR(255) NULL,
      EmailStatus NVARCHAR(24) NOT NULL CONSTRAINT DF_BBVA_CertificationCommunication_EmailStatus DEFAULT N'NOT_PREPARED',
      EmailTemplateId UNIQUEIDENTIFIER NULL,
      EmailTemplateVersion INT NULL,
      EmailSubject NVARCHAR(300) NULL,
      EmailBody NVARCHAR(MAX) NULL,
      IdempotencyKey NVARCHAR(200) NOT NULL,
      GeneratedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CertificationCommunication_GeneratedAt DEFAULT SYSUTCDATETIME(),
      GeneratedByEmail NVARCHAR(255) NOT NULL,
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CertificationCommunication_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CONSTRAINT FK_BBVA_CertificationCommunication_Record FOREIGN KEY (PersonCertificationId) REFERENCES bbva.PersonCertification(Id),
      CONSTRAINT FK_BBVA_CertificationCommunication_Attempt FOREIGN KEY (AttemptId) REFERENCES bbva.PersonCertificationAttempt(Id),
      CONSTRAINT FK_BBVA_CertificationCommunication_Postcard FOREIGN KEY (PostcardTemplateId) REFERENCES bbva.CertificationPostcardTemplate(Id),
      CONSTRAINT FK_BBVA_CertificationCommunication_Email FOREIGN KEY (EmailTemplateId) REFERENCES bbva.CertificationEmailTemplate(Id),
      CONSTRAINT CK_BBVA_CertificationCommunication_Context CHECK (Context IN (N'APPROVED',N'FIRST_FAILED',N'INTERMEDIATE_FAILED',N'LAST_FAILED',N'LOW',N'DEFAULT')),
      CONSTRAINT CK_BBVA_CertificationCommunication_EmailStatus CHECK (EmailStatus IN (N'NOT_PREPARED',N'PREPARED',N'SENT',N'FAILED')),
      CONSTRAINT CK_BBVA_CertificationCommunication_Cycle CHECK (CycleNumber > 0)
    );
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.CertificationCommunication') AND name=N'UX_BBVA_CertificationCommunication_Idempotency')
    CREATE UNIQUE INDEX UX_BBVA_CertificationCommunication_Idempotency ON bbva.CertificationCommunication(IdempotencyKey);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.CertificationCommunication') AND name=N'IX_BBVA_CertificationCommunication_Attempt')
    CREATE INDEX IX_BBVA_CertificationCommunication_Attempt ON bbva.CertificationCommunication(PersonCertificationId,AttemptId,GeneratedAt DESC);

  DECLARE @Actor NVARCHAR(255)=N'bbva-certification-communications-v13@local';
  DECLARE @Postcards TABLE(Context NVARCHAR(32), Name NVARCHAR(160), Eyebrow NVARCHAR(180), TitleTemplate NVARCHAR(300), MessageTemplate NVARCHAR(1000), Accent NVARCHAR(16));
  INSERT INTO @Postcards VALUES
    (N'APPROVED',N'Felicitación',N'CERTIFICACIÓN COMPLETADA',N'¡Felicidades, {{firstName}}!',N'Has aprobado {{certificationName}}. Este resultado refleja tu preparación y constancia.',N'#1464A5'),
    (N'FIRST_FAILED',N'Motivación primer intento',N'PRIMER INTENTO',N'Seguimos adelante, {{firstName}}',N'Este intento de {{certificationName}} no fue aprobado. Úsalo como referencia para reforzar los temas y preparar el siguiente paso.',N'#7C3AED'),
    (N'INTERMEDIATE_FAILED',N'Refuerzo',N'SEGUIMIENTO DE CERTIFICACIÓN',N'Continúa con el refuerzo',N'El intento {{attemptNumber}} de {{certificationName}} no fue aprobado. Revisa el resultado y enfoca el siguiente estudio en las áreas pendientes.',N'#B45309'),
    (N'LAST_FAILED',N'Resultado final',N'RESULTADO DEL CICLO',N'Resultado final de {{certificationName}}',N'Se registró el último intento configurado para este ciclo. El resultado queda disponible para el seguimiento correspondiente.',N'#9F1239'),
    (N'LOW',N'Baja',N'CIERRE DE SEGUIMIENTO',N'Cierre de {{certificationName}}',N'La lógica vigente de seguimiento determinó el cierre por agotamiento de intentos. Esta comunicación no decide la baja.',N'#7F1D1D'),
    (N'DEFAULT',N'Comunicación general',N'SEGUIMIENTO DE CERTIFICACIÓN',N'Actualización de {{certificationName}}',N'Se registró una actualización en tu proceso de certificación.',N'#1464A5');

  INSERT INTO bbva.CertificationPostcardTemplate(CertificationId,Context,Version,Name,EyebrowTemplate,TitleTemplate,MessageTemplate,Accent,CreatedByEmail)
  SELECT NULL,p.Context,1,p.Name,p.Eyebrow,p.TitleTemplate,p.MessageTemplate,p.Accent,@Actor
  FROM @Postcards p
  WHERE NOT EXISTS (SELECT 1 FROM bbva.CertificationPostcardTemplate t WHERE t.CertificationId IS NULL AND t.Context=p.Context AND t.Version=1);

  DECLARE @Emails TABLE(Context NVARCHAR(32), SubjectTemplate NVARCHAR(300), BodyTemplate NVARCHAR(MAX));
  INSERT INTO @Emails VALUES
    (N'APPROVED',N'Felicitaciones por {{certificationName}}',N'Hola {{firstName}},\n\n¡Felicidades! Se registró como aprobado tu resultado de {{certificationName}}.\n\nResultado: {{result}}\nIntento: {{attemptNumber}}\nFecha: {{attemptDate}}\n\nAdjuntamos la postal correspondiente.'),
    (N'FIRST_FAILED',N'Seguimiento de {{certificationName}}',N'Hola {{firstName}},\n\nSe registró tu primer intento de {{certificationName}} como no aprobado. Te recomendamos revisar los temas pendientes antes del siguiente intento.\n\nFecha: {{attemptDate}}.'),
    (N'INTERMEDIATE_FAILED',N'Refuerzo para {{certificationName}}',N'Hola {{firstName}},\n\nSe registró el intento {{attemptNumber}} de {{certificationName}} como no aprobado. Continúa con el plan de refuerzo y seguimiento.\n\nFecha: {{attemptDate}}.'),
    (N'LAST_FAILED',N'Resultado final de {{certificationName}}',N'Hola {{firstName}},\n\nSe registró el último intento configurado de {{certificationName}} para este ciclo. El resultado queda disponible para el seguimiento correspondiente.\n\nFecha: {{attemptDate}}.'),
    (N'LOW',N'Cierre de seguimiento de {{certificationName}}',N'Hola {{firstName}},\n\nLa lógica vigente de BFS determinó el cierre del seguimiento de {{certificationName}} por agotamiento de intentos. La postal adjunta comunica el resultado ya registrado.'),
    (N'DEFAULT',N'Actualización de {{certificationName}}',N'Hola {{firstName}},\n\nSe registró una actualización en tu proceso de {{certificationName}}.');

  INSERT INTO bbva.CertificationEmailTemplate(CertificationId,Context,Version,SubjectTemplate,BodyTemplate,CreatedByEmail)
  SELECT NULL,e.Context,1,e.SubjectTemplate,e.BodyTemplate,@Actor
  FROM @Emails e
  WHERE NOT EXISTS (SELECT 1 FROM bbva.CertificationEmailTemplate t WHERE t.CertificationId IS NULL AND t.Context=e.Context AND t.Version=1);

  COMMIT TRANSACTION;
  PRINT N'Migración V13 de comunicaciones de certificación aplicada correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
