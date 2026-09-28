SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID(N'bbva.PersonCertification', N'U') IS NULL
    THROW 51000, N'No existe bbva.PersonCertification.', 1;

  -- SQL Server compila las referencias de columna del batch antes de ejecutar
  -- el ALTER TABLE. Crear la columna mediante SQL dinámico garantiza que las
  -- sentencias posteriores se compilen cuando CertificationLevel ya exista.
  IF COL_LENGTH(N'bbva.PersonCertification', N'CertificationLevel') IS NULL
  BEGIN
    EXEC sys.sp_executesql N'
      ALTER TABLE bbva.PersonCertification
      ADD CertificationLevel NVARCHAR(16) NULL;
    ';
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'bbva.PersonCertification')
      AND name = N'CK_BBVA_PersonCertification_Level'
  )
  BEGIN
    EXEC sys.sp_executesql N'
      ALTER TABLE bbva.PersonCertification
      ADD CONSTRAINT CK_BBVA_PersonCertification_Level
      CHECK (
        CertificationLevel IS NULL
        OR CertificationLevel IN (N''JR'', N''STD'', N''SR'', N''GENERIC'')
      );
    ';
  END;

  -- Compilar el UPDATE después de garantizar físicamente la columna.
  EXEC sys.sp_executesql N'
    UPDATE pc
       SET CertificationLevel =
         CASE
           WHEN cc.CertificationType = N''TECHNOLOGICAL''
             THEN UPPER(COALESCE(cp.Seniority, p.Expertise))
           ELSE N''GENERIC''
         END
    FROM bbva.PersonCertification pc
    INNER JOIN bbva.CertificationCatalog cc
      ON cc.Id = pc.CertificationId
    INNER JOIN bbva.Person p
      ON p.Id = pc.PersonId
    LEFT JOIN bbva.CatalogProfile cp
      ON cp.Id = p.ProfileCatalogId
    WHERE pc.CertificationLevel IS NULL
      AND (
        cc.CertificationType <> N''TECHNOLOGICAL''
        OR UPPER(COALESCE(cp.Seniority, p.Expertise)) IN (N''JR'', N''STD'', N''SR'')
      );
  ';

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;
  THROW;
END CATCH;
