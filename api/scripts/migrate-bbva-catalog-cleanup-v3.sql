SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    THROW 51000, 'El esquema bbva no existe. Ejecuta primero los scripts base.', 1;

  /* ----------------------------------------------------------------------
     1. Retirar reglas por perfil que ya no forman parte del modelo operativo.
     La aplicabilidad se resuelve por niveles/seniority, no mediante relaciones
     persistentes ocultas que inflen la "Cantidad de usos" de perfiles.
     ---------------------------------------------------------------------- */
  IF OBJECT_ID(N'bbva.CertificationProfileRule', N'U') IS NOT NULL
    DROP TABLE bbva.CertificationProfileRule;

  /* ----------------------------------------------------------------------
     2. Eliminar Código de todos los catálogos, incluidos índices asociados.
     ---------------------------------------------------------------------- */
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_CatalogTechnology_Code' AND object_id=OBJECT_ID(N'bbva.CatalogTechnology'))
    DROP INDEX UX_BBVA_CatalogTechnology_Code ON bbva.CatalogTechnology;

  IF EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_CatalogProfile_Code' AND object_id=OBJECT_ID(N'bbva.CatalogProfile'))
    DROP INDEX UX_BBVA_CatalogProfile_Code ON bbva.CatalogProfile;

  IF EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_BBVA_CertificationCatalog_Code' AND object_id=OBJECT_ID(N'bbva.CertificationCatalog'))
    DROP INDEX UX_BBVA_CertificationCatalog_Code ON bbva.CertificationCatalog;

  IF OBJECT_ID(N'bbva.CatalogCategory', N'U') IS NOT NULL AND COL_LENGTH(N'bbva.CatalogCategory', N'Code') IS NOT NULL
    ALTER TABLE bbva.CatalogCategory DROP COLUMN Code;

  IF OBJECT_ID(N'bbva.CatalogTechnology', N'U') IS NOT NULL AND COL_LENGTH(N'bbva.CatalogTechnology', N'Code') IS NOT NULL
    ALTER TABLE bbva.CatalogTechnology DROP COLUMN Code;

  IF OBJECT_ID(N'bbva.CatalogProfile', N'U') IS NOT NULL AND COL_LENGTH(N'bbva.CatalogProfile', N'Code') IS NOT NULL
    ALTER TABLE bbva.CatalogProfile DROP COLUMN Code;

  IF OBJECT_ID(N'bbva.CatalogTechnologyProfile', N'U') IS NOT NULL AND COL_LENGTH(N'bbva.CatalogTechnologyProfile', N'Code') IS NOT NULL
    ALTER TABLE bbva.CatalogTechnologyProfile DROP COLUMN Code;

  IF OBJECT_ID(N'bbva.CertificationCatalog', N'U') IS NOT NULL AND COL_LENGTH(N'bbva.CertificationCatalog', N'Code') IS NOT NULL
    ALTER TABLE bbva.CertificationCatalog DROP COLUMN Code;

  IF OBJECT_ID(N'bbva.CertificationCatalogHistory', N'U') IS NOT NULL AND COL_LENGTH(N'bbva.CertificationCatalogHistory', N'CertificationCode') IS NOT NULL
    ALTER TABLE bbva.CertificationCatalogHistory DROP COLUMN CertificationCode;

  /* ----------------------------------------------------------------------
     3. Reparar texto de semillas que pudo cargarse con sustitución de acentos.
     Solo se normalizan registros provenientes de la semilla oficial.
     ---------------------------------------------------------------------- */
  IF OBJECT_ID(N'bbva.CatalogTechnology', N'U') IS NOT NULL
  BEGIN
    UPDATE bbva.CatalogTechnology
    SET Description=N'Tecnología habilitada para configuración de certificaciones.',
        UpdatedAt=SYSUTCDATETIME()
    WHERE CreatedByEmail=N'system@softtek.com'
      AND Description IS NOT NULL
      AND (Description LIKE N'%?%' OR Description LIKE N'%Tecnolog%configuraci%');
  END;

  IF OBJECT_ID(N'bbva.CertificationCatalog', N'U') IS NOT NULL
  BEGIN
    DECLARE @CertificationDescriptions TABLE (Name NVARCHAR(180) PRIMARY KEY, Description NVARCHAR(1000));
    INSERT INTO @CertificationDescriptions (Name,Description) VALUES
      (N'BI HOST SENIOR',N'Certificación tecnológica de BI Host.'),
      (N'BI IPC ETL SENIOR',N'Certificación tecnológica de BI IPC ETL.'),
      (N'BI JAVA SENIOR',N'Certificación tecnológica de BI Java.'),
      (N'BI MICROSTRATEGY SENIOR',N'Certificación tecnológica de BI MicroStrategy.'),
      (N'BI ORACLE SENIOR',N'Certificación tecnológica de BI Oracle.'),
      (N'BI SAS SENIOR',N'Certificación tecnológica de BI SAS.'),
      (N'CELLS',N'Certificación tecnológica Cells.'),
      (N'DATIO',N'Certificación tecnológica Datio.'),
      (N'HTML',N'Certificación tecnológica HTML.'),
      (N'INTELIGENCIA ARTIFICIAL',N'Certificación tecnológica de Inteligencia Artificial.'),
      (N'JAVA 8',N'Certificación tecnológica Java 8.'),
      (N'JAVA',N'Certificación tecnológica Java.'),
      (N'LRBA',N'Certificación tecnológica LRBA.'),
      (N'NACAR LIGERO',N'Certificación tecnológica Nacar Ligero.'),
      (N'ORACLE',N'Certificación tecnológica Oracle.'),
      (N'ANDROID',N'Certificación tecnológica Android.'),
      (N'SALESFORCE',N'Certificación tecnológica Salesforce.'),
      (N'API MARKET',N'Certificación tecnológica API Market.'),
      (N'JAVA - APX',N'Certificación tecnológica Java - APX.'),
      (N'ISTQB',N'Certificación tecnológica ISTQB.'),
      (N'API CHANNEL',N'Certificación tecnológica API Channel.'),
      (N'ASO DESARROLLO',N'Certificación tecnológica ASO Desarrollo.'),
      (N'ASO DISEÑO',N'Certificación tecnológica ASO Diseño.'),
      (N'DESARROLLO SEGURO',N'Certificación de seguridad con recertificación anual.'),
      (N'SAFE PRACTITIONER',N'Certificación metodológica de conocimiento ágil; certificación única.'),
      (N'SCRUM DEVELOPER',N'Certificación metodológica de conocimiento ágil; certificación única.');

    UPDATE c
    SET c.Description=d.Description,
        c.UpdatedAt=SYSUTCDATETIME()
    FROM bbva.CertificationCatalog c
    INNER JOIN @CertificationDescriptions d ON UPPER(d.Name)=UPPER(c.Name)
    WHERE c.CreatedByEmail=N'system@softtek.com'
      AND (c.Description IS NULL OR c.Description<>d.Description);
  END;

  COMMIT TRANSACTION;
  PRINT N'Limpieza de catálogos BBVA aplicada correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
