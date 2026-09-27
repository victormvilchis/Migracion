SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    THROW 51000, N'No existe el schema bbva.', 1;

  IF OBJECT_ID(N'bbva.SystemRole', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.SystemRole (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_SystemRole PRIMARY KEY DEFAULT NEWID(),
      Code NVARCHAR(50) NOT NULL,
      Name NVARCHAR(120) NOT NULL,
      Description NVARCHAR(500) NULL,
      IsDeliveryManager BIT NOT NULL CONSTRAINT DF_BBVA_SystemRole_IsDeliveryManager DEFAULT 0,
      IsSystem BIT NOT NULL CONSTRAINT DF_BBVA_SystemRole_IsSystem DEFAULT 0,
      Status NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_SystemRole_Status DEFAULT N'ACTIVE',
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_SystemRole_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_SystemRole_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT CK_BBVA_SystemRole_Status CHECK (Status IN (N'ACTIVE',N'INACTIVE'))
    );
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.SystemRole') AND name=N'UX_BBVA_SystemRole_Code')
    CREATE UNIQUE INDEX UX_BBVA_SystemRole_Code ON bbva.SystemRole(Code);

  IF OBJECT_ID(N'bbva.SystemUser', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.SystemUser (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_SystemUser PRIMARY KEY DEFAULT NEWID(),
      FullName NVARCHAR(220) NOT NULL,
      Email NVARCHAR(255) NULL,
      CorporateUser NVARCHAR(100) NULL,
      SofttekCode NVARCHAR(80) NULL,
      Status NVARCHAR(16) NOT NULL CONSTRAINT DF_BBVA_SystemUser_Status DEFAULT N'ACTIVE',
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_SystemUser_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_SystemUser_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT CK_BBVA_SystemUser_Status CHECK (Status IN (N'ACTIVE',N'INACTIVE'))
    );
  END;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.SystemUser') AND name=N'IX_BBVA_SystemUser_Name_Status')
    CREATE INDEX IX_BBVA_SystemUser_Name_Status ON bbva.SystemUser(FullName,Status);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.SystemUser') AND name=N'UX_BBVA_SystemUser_Email')
    CREATE UNIQUE INDEX UX_BBVA_SystemUser_Email ON bbva.SystemUser(Email) WHERE Email IS NOT NULL;
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.SystemUser') AND name=N'UX_BBVA_SystemUser_CorporateUser')
    CREATE UNIQUE INDEX UX_BBVA_SystemUser_CorporateUser ON bbva.SystemUser(CorporateUser) WHERE CorporateUser IS NOT NULL;
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.SystemUser') AND name=N'UX_BBVA_SystemUser_SofttekCode')
    CREATE UNIQUE INDEX UX_BBVA_SystemUser_SofttekCode ON bbva.SystemUser(SofttekCode) WHERE SofttekCode IS NOT NULL;

  IF OBJECT_ID(N'bbva.SystemUserRole', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.SystemUserRole (
      UserId UNIQUEIDENTIFIER NOT NULL,
      RoleId UNIQUEIDENTIFIER NOT NULL,
      AssignedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_SystemUserRole_AssignedAt DEFAULT SYSUTCDATETIME(),
      AssignedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT PK_BBVA_SystemUserRole PRIMARY KEY(UserId,RoleId),
      CONSTRAINT FK_BBVA_SystemUserRole_User FOREIGN KEY(UserId) REFERENCES bbva.SystemUser(Id),
      CONSTRAINT FK_BBVA_SystemUserRole_Role FOREIGN KEY(RoleId) REFERENCES bbva.SystemRole(Id)
    );
  END;

  DECLARE @Actor NVARCHAR(255)=N'bbva-users-postcards-v14@local';

  DECLARE @SeedRoles TABLE(Code NVARCHAR(50),Name NVARCHAR(120),Description NVARCHAR(500),IsDeliveryManager BIT);
  INSERT INTO @SeedRoles VALUES
    (N'ADMINISTRATOR',N'Administrador',N'Administración funcional del workspace BBVA.',0),
    (N'SUPERVISOR',N'Supervisor',N'Seguimiento y operación de talento y certificaciones.',0),
    (N'MANAGER',N'Gestor',N'Gestión operativa y consulta de información.',0),
    (N'DELIVERY_MANAGER',N'Delivery Manager',N'Responsable de seguimiento de colaboradores.',1);

  MERGE bbva.SystemRole AS target
  USING @SeedRoles AS source
     ON target.Code=source.Code
  WHEN MATCHED THEN UPDATE SET
      Name=source.Name,
      Description=source.Description,
      IsDeliveryManager=source.IsDeliveryManager,
      IsSystem=1,
      UpdatedAt=SYSUTCDATETIME(),
      UpdatedByEmail=@Actor
  WHEN NOT MATCHED THEN INSERT(Code,Name,Description,IsDeliveryManager,IsSystem,Status,CreatedByEmail,UpdatedByEmail)
      VALUES(source.Code,source.Name,source.Description,source.IsDeliveryManager,1,N'ACTIVE',@Actor,@Actor);

  /*
    Conserva los DM históricos como opciones administrables. No inventa correo,
    IS ni XM: esos datos pueden completarse después desde Administración > Usuarios.
  */
  IF OBJECT_ID(N'bbva.Collaborator', N'U') IS NOT NULL
  BEGIN
    INSERT INTO bbva.SystemUser(FullName,Email,CorporateUser,SofttekCode,Status,CreatedByEmail,UpdatedByEmail)
    SELECT DISTINCT LTRIM(RTRIM(c.DeliveryManager)),NULL,NULL,NULL,N'ACTIVE',@Actor,@Actor
    FROM bbva.Collaborator c
    WHERE NULLIF(LTRIM(RTRIM(c.DeliveryManager)),N'') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM bbva.SystemUser u
        WHERE UPPER(LTRIM(RTRIM(u.FullName)))=UPPER(LTRIM(RTRIM(c.DeliveryManager)))
      );

    INSERT INTO bbva.SystemUserRole(UserId,RoleId,AssignedByEmail)
    SELECT u.Id,r.Id,@Actor
    FROM bbva.SystemUser u
    INNER JOIN bbva.SystemRole r ON r.Code=N'DELIVERY_MANAGER'
    WHERE EXISTS (
      SELECT 1 FROM bbva.Collaborator c
      WHERE UPPER(LTRIM(RTRIM(c.DeliveryManager)))=UPPER(LTRIM(RTRIM(u.FullName)))
    )
      AND NOT EXISTS (SELECT 1 FROM bbva.SystemUserRole ur WHERE ur.UserId=u.Id AND ur.RoleId=r.Id);
  END;

  /* Plantillas corporativas v2: se conserva la v1 para el histórico. */
  IF OBJECT_ID(N'bbva.CertificationPostcardTemplate', N'U') IS NOT NULL
  BEGIN
    DECLARE @PostcardsV2 TABLE(Context NVARCHAR(32),Name NVARCHAR(160),Eyebrow NVARCHAR(180),TitleTemplate NVARCHAR(300),MessageTemplate NVARCHAR(1000),Accent NVARCHAR(16));
    INSERT INTO @PostcardsV2 VALUES
      (N'APPROVED',N'Resultado aprobado · corporativo',N'CERTIFICACIÓN COMPLETADA',N'¡Felicidades, {{firstName}}!',N'Has aprobado {{certificationName}}. Reconocemos tu preparación y el compromiso demostrado durante este proceso.',N'#1464A5'),
      (N'FIRST_FAILED',N'Primer intento · corporativo',N'SEGUIMIENTO DE CERTIFICACIÓN',N'Continuamos contigo, {{firstName}}',N'El primer intento de {{certificationName}} quedó registrado como no aprobado. Revisa los temas de refuerzo y prepara tu siguiente presentación.',N'#1464A5'),
      (N'INTERMEDIATE_FAILED',N'Refuerzo · corporativo',N'SEGUIMIENTO DE CERTIFICACIÓN',N'Enfoque para el siguiente intento',N'El intento {{attemptNumber}} de {{certificationName}} quedó registrado como no aprobado. Utiliza el resultado para priorizar tu plan de refuerzo.',N'#1464A5'),
      (N'LAST_FAILED',N'Resultado de ciclo · corporativo',N'RESULTADO DE CERTIFICACIÓN',N'Resultado del ciclo',N'Se registró el último intento configurado para {{certificationName}}. Consulta con tu responsable el seguimiento correspondiente.',N'#1464A5'),
      (N'LOW',N'Cierre de seguimiento · corporativo',N'CIERRE DE SEGUIMIENTO',N'Cierre de {{certificationName}}',N'Se actualizó el seguimiento de {{certificationName}} conforme al resultado registrado en el ciclo.',N'#1464A5'),
      (N'DEFAULT',N'Actualización · corporativo',N'SEGUIMIENTO DE CERTIFICACIÓN',N'Actualización de {{certificationName}}',N'Se registró una actualización en tu proceso de certificación.',N'#1464A5');

    INSERT INTO bbva.CertificationPostcardTemplate(CertificationId,Context,Version,Name,EyebrowTemplate,TitleTemplate,MessageTemplate,Accent,CreatedByEmail)
    SELECT NULL,p.Context,2,p.Name,p.Eyebrow,p.TitleTemplate,p.MessageTemplate,p.Accent,@Actor
    FROM @PostcardsV2 p
    WHERE NOT EXISTS (SELECT 1 FROM bbva.CertificationPostcardTemplate t WHERE t.CertificationId IS NULL AND t.Context=p.Context AND t.Version=2);
  END;

  IF OBJECT_ID(N'bbva.CertificationEmailTemplate', N'U') IS NOT NULL
  BEGIN
    DECLARE @EmailsV2 TABLE(Context NVARCHAR(32),SubjectTemplate NVARCHAR(300),BodyTemplate NVARCHAR(MAX));
    INSERT INTO @EmailsV2 VALUES
      (N'APPROVED',N'Felicitaciones por {{certificationName}}',N'Hola {{firstName}},\n\n¡Felicidades! Tu resultado de {{certificationName}} quedó registrado como aprobado.\n\nResultado: {{result}}\nIntento: {{attemptNumber}}\nFecha: {{attemptDate}}\n\nAdjuntamos la comunicación de tu certificación.\n\nSaludos.'),
      (N'FIRST_FAILED',N'Seguimiento de {{certificationName}}',N'Hola {{firstName}},\n\nTu primer intento de {{certificationName}} quedó registrado como no aprobado. Te sugerimos revisar los temas identificados y preparar el siguiente intento con tu plan de refuerzo.\n\nFecha: {{attemptDate}}\n\nSaludos.'),
      (N'INTERMEDIATE_FAILED',N'Seguimiento de {{certificationName}} · intento {{attemptNumber}}',N'Hola {{firstName}},\n\nEl intento {{attemptNumber}} de {{certificationName}} quedó registrado como no aprobado. Continúa con el plan de refuerzo acordado antes de tu siguiente presentación.\n\nFecha: {{attemptDate}}\n\nSaludos.'),
      (N'LAST_FAILED',N'Resultado de {{certificationName}}',N'Hola {{firstName}},\n\nSe registró el resultado del último intento configurado para {{certificationName}} en este ciclo. Revisa con tu responsable los siguientes pasos del seguimiento.\n\nFecha: {{attemptDate}}\n\nSaludos.'),
      (N'LOW',N'Actualización de seguimiento · {{certificationName}}',N'Hola {{firstName}},\n\nSe actualizó el seguimiento de {{certificationName}} conforme al resultado registrado en el ciclo.\n\nSaludos.'),
      (N'DEFAULT',N'Actualización de {{certificationName}}',N'Hola {{firstName}},\n\nSe registró una actualización en tu proceso de {{certificationName}}.\n\nSaludos.');

    INSERT INTO bbva.CertificationEmailTemplate(CertificationId,Context,Version,SubjectTemplate,BodyTemplate,CreatedByEmail)
    SELECT NULL,e.Context,2,e.SubjectTemplate,e.BodyTemplate,@Actor
    FROM @EmailsV2 e
    WHERE NOT EXISTS (SELECT 1 FROM bbva.CertificationEmailTemplate t WHERE t.CertificationId IS NULL AND t.Context=e.Context AND t.Version=2);
  END;

  COMMIT TRANSACTION;
  PRINT N'Migración V14 de usuarios, roles y plantillas corporativas aplicada correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
