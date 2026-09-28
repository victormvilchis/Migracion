SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    THROW 51000, N'No existe el schema bbva.', 1;

  IF OBJECT_ID(N'bbva.PersonCertification', N'U') IS NULL
    THROW 51000, N'No existe bbva.PersonCertification. Ejecuta primero las migraciones de certificaciones.', 1;

  IF OBJECT_ID(N'bbva.CertificationCriticalResolution', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.CertificationCriticalResolution (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BBVA_CertificationCriticalResolution PRIMARY KEY DEFAULT NEWID(),
      PersonCertificationId UNIQUEIDENTIFIER NOT NULL,
      CycleNumber INT NOT NULL,
      ResolutionStatus NVARCHAR(24) NOT NULL CONSTRAINT DF_BBVA_CertificationCriticalResolution_Status DEFAULT N'PENDING_REVIEW',
      Notes NVARCHAR(1000) NULL,
      ResolvedAt DATETIME2(3) NULL,
      CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CertificationCriticalResolution_CreatedAt DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_CertificationCriticalResolution_UpdatedAt DEFAULT SYSUTCDATETIME(),
      CreatedByEmail NVARCHAR(255) NOT NULL,
      UpdatedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT FK_BBVA_CertificationCriticalResolution_Record FOREIGN KEY (PersonCertificationId) REFERENCES bbva.PersonCertification(Id),
      CONSTRAINT CK_BBVA_CertificationCriticalResolution_Cycle CHECK (CycleNumber > 0),
      CONSTRAINT CK_BBVA_CertificationCriticalResolution_Status CHECK (ResolutionStatus IN (N'PENDING_REVIEW',N'LOW_REQUESTED',N'INTERN',N'LOW_CONFIRMED'))
    );
  END;

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'bbva.CertificationCriticalResolution')
      AND name=N'UX_BBVA_CertificationCriticalResolution_Record_Cycle'
  )
    CREATE UNIQUE INDEX UX_BBVA_CertificationCriticalResolution_Record_Cycle
      ON bbva.CertificationCriticalResolution(PersonCertificationId,CycleNumber);

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'bbva.CertificationCriticalResolution')
      AND name=N'IX_BBVA_CertificationCriticalResolution_Status'
  )
    CREATE INDEX IX_BBVA_CertificationCriticalResolution_Status
      ON bbva.CertificationCriticalResolution(ResolutionStatus,UpdatedAt DESC)
      INCLUDE (PersonCertificationId,CycleNumber,ResolvedAt);

  -- Backfill de casos 2/2 ya existentes. Sin esta fila persistida, la UI puede
  -- detectarlos por intentos pero las reglas de ciclo de vida no tendrían una
  -- resolución abierta que proteger. No se inventa una decisión: queda PENDING_REVIEW.
  INSERT INTO bbva.CertificationCriticalResolution(
    PersonCertificationId,CycleNumber,ResolutionStatus,CreatedByEmail,UpdatedByEmail
  )
  SELECT pc.Id,pc.CurrentCycle,N'PENDING_REVIEW',N'system.checkpoint@basebfs.local',N'system.checkpoint@basebfs.local'
  FROM bbva.PersonCertification pc
  INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
  OUTER APPLY (
    SELECT TOP 1 a.Result
    FROM bbva.PersonCertificationAttempt a
    WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle
    ORDER BY a.AttemptNumber DESC,a.CreatedAt DESC,a.Id DESC
  ) latestAttempt
  WHERE pc.Applicable=1
    AND pc.BaseStatus=N'FAILED'
    AND cc.RequiresAttempts=1
    AND cc.MaxAttempts=2
    AND cc.CertificationType IN (N'DEVELOPMENT_SECURITY',N'TECHNOLOGICAL',N'NORMATIVE_TESTING')
    AND latestAttempt.Result=N'FAILED'
    AND (SELECT COUNT(1) FROM bbva.PersonCertificationAttempt a WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle) >= 2
    AND NOT EXISTS (
      SELECT 1 FROM bbva.CertificationCriticalResolution r
      WHERE r.PersonCertificationId=pc.Id AND r.CycleNumber=pc.CurrentCycle
    );

  IF OBJECT_ID(N'bbva.DashboardMetricSnapshot', N'U') IS NULL
  BEGIN
    CREATE TABLE bbva.DashboardMetricSnapshot (
      SnapshotDate DATE NOT NULL CONSTRAINT PK_BBVA_DashboardMetricSnapshot PRIMARY KEY,
      CollaboratorsActive INT NOT NULL,
      TalentBankActive INT NOT NULL,
      CertificationsApplicable INT NOT NULL,
      CoveragePercent DECIMAL(7,2) NOT NULL,
      Expiring INT NOT NULL,
      Expired INT NOT NULL,
      RecertificationPending INT NOT NULL,
      Pending INT NOT NULL,
      DataQualityPending INT NOT NULL,
      VendorReadyPercent DECIMAL(7,2) NOT NULL,
      VendorPending INT NOT NULL,
      VendorExitRequired INT NOT NULL,
      CapturedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BBVA_DashboardMetricSnapshot_CapturedAt DEFAULT SYSUTCDATETIME(),
      CapturedByEmail NVARCHAR(255) NOT NULL,
      CONSTRAINT CK_BBVA_DashboardMetricSnapshot_NonNegative CHECK (
        CollaboratorsActive >= 0 AND TalentBankActive >= 0 AND CertificationsApplicable >= 0
        AND Expiring >= 0 AND Expired >= 0 AND RecertificationPending >= 0 AND Pending >= 0
        AND DataQualityPending >= 0 AND VendorPending >= 0 AND VendorExitRequired >= 0
      ),
      CONSTRAINT CK_BBVA_DashboardMetricSnapshot_Percent CHECK (
        CoveragePercent >= 0 AND CoveragePercent <= 100
        AND VendorReadyPercent >= 0 AND VendorReadyPercent <= 100
      )
    );
  END;

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'bbva.DashboardMetricSnapshot')
      AND name=N'IX_BBVA_DashboardMetricSnapshot_CapturedAt'
  )
    CREATE INDEX IX_BBVA_DashboardMetricSnapshot_CapturedAt
      ON bbva.DashboardMetricSnapshot(CapturedAt DESC);

  COMMIT TRANSACTION;
  PRINT N'Checkpoint V19: resoluciones críticas e histórico KPI configurados.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
