SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL THROW 51000, N'No existe el schema bbva.', 1;
  IF OBJECT_ID(N'bbva.CertificationCatalog',N'U') IS NULL THROW 51000, N'No existe bbva.CertificationCatalog.', 1;
  IF OBJECT_ID(N'bbva.PersonCertification',N'U') IS NULL THROW 51000, N'No existe bbva.PersonCertification.', 1;
  IF OBJECT_ID(N'bbva.Person',N'U') IS NULL THROW 51000, N'No existe bbva.Person.', 1;

  /* Reglas iniciales documentadas para nuevos ingresos BBVA.
     - Tecnológica: 30 días totales, primer intento a los 15 días.
     - Desarrollo Seguro: 90 días totales, primer intento a los 45 días.
     - Normativa & Testing: 60 días totales, primer intento a los 30 días.
     - Agile: 90 días totales, primer intento a los 45 días.
     El primer intento se deriva como la mitad del tiempo total; MaxAttempts=2. */
  UPDATE bbva.CertificationCatalog
  SET InitialCompletionDays=30,RequiresAttempts=1,RequiresApplicationDate=1,MaxAttempts=2,UpdatedAt=SYSUTCDATETIME()
  WHERE Status=N'ACTIVE' AND CertificationType=N'TECHNOLOGICAL';

  UPDATE bbva.CertificationCatalog
  SET InitialCompletionDays=90,RequiresAttempts=1,RequiresApplicationDate=1,MaxAttempts=2,UpdatedAt=SYSUTCDATETIME()
  WHERE Status=N'ACTIVE' AND CertificationType=N'DEVELOPMENT_SECURITY';

  UPDATE bbva.CertificationCatalog
  SET InitialCompletionDays=60,RequiresAttempts=1,RequiresApplicationDate=1,MaxAttempts=2,UpdatedAt=SYSUTCDATETIME()
  WHERE Status=N'ACTIVE' AND CertificationType=N'NORMATIVE_TESTING';

  UPDATE bbva.CertificationCatalog
  SET InitialCompletionDays=90,RequiresAttempts=1,RequiresApplicationDate=1,DefaultMandatory=1,MaxAttempts=2,UpdatedAt=SYSUTCDATETIME()
  WHERE Status=N'ACTIVE' AND UPPER(LTRIM(RTRIM(Name)))=N'AGILE';

  /* Backfill conservador: únicamente registros iniciales sin fecha límite.
     No se pisan límites importados ni ciclos ya aprobados. */
  UPDATE pc
  SET InitialDueDate=DATEADD(day,cc.InitialCompletionDays,c.StartDate),
      UpdatedAt=SYSUTCDATETIME(),
      UpdatedByEmail=N'bbva-initial-certification-windows-v31.5@local'
  FROM bbva.PersonCertification pc
  INNER JOIN bbva.Collaborator c ON c.PersonId=pc.PersonId AND c.Status=N'ACTIVE'
  INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
  WHERE pc.InitialDueDate IS NULL
    AND c.StartDate IS NOT NULL
    AND pc.CurrentCycle=1
    AND pc.Applicable=1
    AND pc.BaseStatus IN (N'PENDING',N'SCHEDULED',N'APPLIED',N'FAILED')
    AND cc.InitialCompletionDays IS NOT NULL
    AND (
      cc.CertificationType IN (N'TECHNOLOGICAL',N'DEVELOPMENT_SECURITY',N'NORMATIVE_TESTING')
      OR UPPER(LTRIM(RTRIM(cc.Name)))=N'AGILE'
    );

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
