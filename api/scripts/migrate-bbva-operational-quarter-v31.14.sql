SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'bbva.OperationalQuarterConfig',N'U') IS NULL
  THROW 51000, N'No existe bbva.OperationalQuarterConfig. Ejecuta primero la migración de periodos operativos.', 1;

/* V31.14: Vendors deja de forzar la ventana operativa. */
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_OperationalQuarterConfig_DerivedWindow' AND parent_object_id=OBJECT_ID(N'bbva.OperationalQuarterConfig'))
  ALTER TABLE bbva.OperationalQuarterConfig DROP CONSTRAINT CK_OperationalQuarterConfig_DerivedWindow;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_OperationalQuarterConfig_MonthStart' AND parent_object_id=OBJECT_ID(N'bbva.OperationalQuarterConfig'))
  ALTER TABLE bbva.OperationalQuarterConfig WITH CHECK ADD CONSTRAINT CK_OperationalQuarterConfig_MonthStart CHECK (DAY(OperationalStartDate)=1);

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_OperationalQuarterConfig_MonthEnd' AND parent_object_id=OBJECT_ID(N'bbva.OperationalQuarterConfig'))
  ALTER TABLE bbva.OperationalQuarterConfig WITH CHECK ADD CONSTRAINT CK_OperationalQuarterConfig_MonthEnd CHECK (OperationalEndDate=EOMONTH(OperationalEndDate));

COMMIT TRANSACTION;
