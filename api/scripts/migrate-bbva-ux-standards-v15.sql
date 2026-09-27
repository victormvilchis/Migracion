SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    THROW 51000, N'No existe el schema bbva.', 1;

  /*
    V15 - Normalización de textos para español de México.
    La corrección se hace por Code, nunca intentando adivinar el texto corrupto.
    Esto permite reparar bases donde una migración previa terminó almacenando ??
    por un problema de encoding en el cliente de SQL.
  */
  IF OBJECT_ID(N'bbva.LifecycleReasonCatalog', N'U') IS NOT NULL
  BEGIN
    DECLARE @Actor NVARCHAR(255)=N'bbva-ux-standards-v15@local';

    UPDATE bbva.LifecycleReasonCatalog
      SET Name=N'Sin proyecto / disponible para asignación',
          UpdatedAt=SYSUTCDATETIME(),
          UpdatedByEmail=@Actor
    WHERE Code=N'AVAILABLE' AND Name<>N'Sin proyecto / disponible para asignación';

    UPDATE bbva.LifecycleReasonCatalog
      SET Name=N'Desasignación a otra cuenta Softtek',
          UpdatedAt=SYSUTCDATETIME(),
          UpdatedByEmail=@Actor
    WHERE Code=N'UNASSIGNED_OTHER_ACCOUNT' AND Name<>N'Desasignación a otra cuenta Softtek';

    UPDATE bbva.LifecycleReasonCatalog
      SET Name=N'Internalización',
          UpdatedAt=SYSUTCDATETIME(),
          UpdatedByEmail=@Actor
    WHERE Code=N'BBVA_EXIT_INTERNALIZATION' AND Name<>N'Internalización';

    UPDATE bbva.LifecycleReasonCatalog
      SET Name=N'Reprobó examen tecnológico',
          UpdatedAt=SYSUTCDATETIME(),
          UpdatedByEmail=@Actor
    WHERE Code=N'BBVA_EXIT_TECH_EXAM' AND Name<>N'Reprobó examen tecnológico';

    UPDATE bbva.LifecycleReasonCatalog
      SET Name=N'Reprobó examen de Desarrollo Seguro',
          UpdatedAt=SYSUTCDATETIME(),
          UpdatedByEmail=@Actor
    WHERE Code=N'BBVA_EXIT_SECURE_DEV_EXAM' AND Name<>N'Reprobó examen de Desarrollo Seguro';

    UPDATE bbva.LifecycleReasonCatalog
      SET Name=N'Reprobó examen de Normativa',
          UpdatedAt=SYSUTCDATETIME(),
          UpdatedByEmail=@Actor
    WHERE Code=N'BBVA_EXIT_NORMATIVE_EXAM' AND Name<>N'Reprobó examen de Normativa';

    UPDATE bbva.LifecycleReasonCatalog
      SET Name=N'Otro motivo de baja de BBVA',
          UpdatedAt=SYSUTCDATETIME(),
          UpdatedByEmail=@Actor
    WHERE Code=N'BBVA_EXIT_OTHER' AND Name<>N'Otro motivo de baja de BBVA';

    UPDATE bbva.LifecycleReasonCatalog
      SET Name=N'Otro',
          UpdatedAt=SYSUTCDATETIME(),
          UpdatedByEmail=@Actor
    WHERE Code=N'OTHER' AND Name<>N'Otro';
  END;

  COMMIT TRANSACTION;
  PRINT N'Migración V15 de estándares UX y español de México aplicada correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
