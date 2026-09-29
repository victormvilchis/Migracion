SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('bbva.Person','OfficeAttendanceDays') IS NULL
  ALTER TABLE bbva.Person ADD OfficeAttendanceDays NVARCHAR(80) NULL;
IF COL_LENGTH('bbva.Person','OfficeSite') IS NULL
  ALTER TABLE bbva.Person ADD OfficeSite NVARCHAR(40) NULL;
IF COL_LENGTH('bbva.Person','OfficeSiteOther') IS NULL
  ALTER TABLE bbva.Person ADD OfficeSiteOther NVARCHAR(160) NULL;
IF COL_LENGTH('bbva.Person','EquipmentTag') IS NULL
  ALTER TABLE bbva.Person ADD EquipmentTag NVARCHAR(100) NULL;

COMMIT TRANSACTION;
