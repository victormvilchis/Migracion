SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF SCHEMA_ID(N'bbva') IS NULL
    THROW 51000, N'No existe el schema bbva.', 1;
  IF OBJECT_ID(N'bbva.TalentBankEntry', N'U') IS NULL
    THROW 51000, N'No existe bbva.TalentBankEntry.', 1;
  IF OBJECT_ID(N'bbva.LifecycleReasonCatalog', N'U') IS NULL
    THROW 51000, N'No existe bbva.LifecycleReasonCatalog.', 1;

  /* 1) Columnas nuevas. Las referencias posteriores usan SQL dinámico para evitar
        la compilación anticipada de SQL Server dentro del mismo batch. */
  IF COL_LENGTH(N'bbva.TalentBankEntry', N'AffiliationType') IS NULL
    ALTER TABLE bbva.TalentBankEntry ADD AffiliationType NVARCHAR(16) NULL;
  IF COL_LENGTH(N'bbva.TalentBankEntry', N'DeletedAt') IS NULL
    ALTER TABLE bbva.TalentBankEntry ADD DeletedAt DATETIME2(3) NULL;
  IF COL_LENGTH(N'bbva.TalentBankEntry', N'DeletedByEmail') IS NULL
    ALTER TABLE bbva.TalentBankEntry ADD DeletedByEmail NVARCHAR(255) NULL;
  IF COL_LENGTH(N'bbva.LifecycleReasonCatalog', N'ReasonGroup') IS NULL
    ALTER TABLE bbva.LifecycleReasonCatalog ADD ReasonGroup NVARCHAR(30) NULL;

  /* 2) Check de TalentType: quitar primero el anterior para permitir el nuevo valor. */
  DECLARE @TypeConstraint SYSNAME;
  SELECT TOP 1 @TypeConstraint=cc.name
  FROM sys.check_constraints cc
  WHERE cc.parent_object_id=OBJECT_ID(N'bbva.TalentBankEntry')
    AND cc.definition LIKE N'%TalentType%';
  IF @TypeConstraint IS NOT NULL
  BEGIN
    DECLARE @DropTypeConstraintSql NVARCHAR(MAX);
    SET @DropTypeConstraintSql = N'ALTER TABLE bbva.TalentBankEntry DROP CONSTRAINT ' + QUOTENAME(@TypeConstraint) + N';';
    EXEC sys.sp_executesql @DropTypeConstraintSql;
  END;

  EXEC sys.sp_executesql N'
    UPDATE bbva.TalentBankEntry
    SET TalentType=N''FORMER_COLLABORATOR''
    WHERE TalentType=N''BBVA_EXIT'';

    UPDATE bbva.TalentBankEntry
    SET AffiliationType=N''INTERNAL''
    WHERE AffiliationType IS NULL OR AffiliationType NOT IN (N''INTERNAL'',N''EXTERNAL'');

    ALTER TABLE bbva.TalentBankEntry ALTER COLUMN AffiliationType NVARCHAR(16) NOT NULL;
  ';
  IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'bbva.TalentBankEntry') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'bbva.TalentBankEntry'),N'AffiliationType','ColumnId'))
    EXEC(N'ALTER TABLE bbva.TalentBankEntry ADD CONSTRAINT DF_BBVA_TalentBankEntry_Affiliation DEFAULT N''INTERNAL'' FOR AffiliationType;');

  ALTER TABLE bbva.TalentBankEntry WITH CHECK ADD CONSTRAINT CK_BBVA_TalentBankEntry_Type
    CHECK (TalentType IN (N'ACADEMY',N'PROSPECT',N'FORMER_COLLABORATOR',N'BBVA_EXIT'));

  DECLARE @AffiliationConstraint SYSNAME;
  SELECT TOP 1 @AffiliationConstraint=cc.name
  FROM sys.check_constraints cc
  WHERE cc.parent_object_id=OBJECT_ID(N'bbva.TalentBankEntry')
    AND cc.definition LIKE N'%AffiliationType%';
  IF @AffiliationConstraint IS NOT NULL
  BEGIN
    DECLARE @DropAffiliationConstraintSql NVARCHAR(MAX);
    SET @DropAffiliationConstraintSql = N'ALTER TABLE bbva.TalentBankEntry DROP CONSTRAINT ' + QUOTENAME(@AffiliationConstraint) + N';';
    EXEC sys.sp_executesql @DropAffiliationConstraintSql;
  END;
  EXEC(N'ALTER TABLE bbva.TalentBankEntry WITH CHECK ADD CONSTRAINT CK_BBVA_TalentBankEntry_Affiliation CHECK (AffiliationType IN (N''INTERNAL'',N''EXTERNAL''));');

  /* 3) Motivos de ciclo de vida. */
  EXEC sys.sp_executesql N'
    UPDATE bbva.LifecycleReasonCatalog
    SET ReasonGroup=CASE Code
        WHEN N''AVAILABLE'' THEN N''AVAILABLE''
        WHEN N''UNASSIGNED'' THEN N''UNASSIGNED''
        WHEN N''BBVA_EXIT'' THEN N''BBVA_EXIT''
        ELSE N''OTHER''
      END
    WHERE ReasonGroup IS NULL;

    ALTER TABLE bbva.LifecycleReasonCatalog ALTER COLUMN ReasonGroup NVARCHAR(30) NOT NULL;
  ';
  IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'bbva.LifecycleReasonCatalog') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'bbva.LifecycleReasonCatalog'),N'ReasonGroup','ColumnId'))
    EXEC(N'ALTER TABLE bbva.LifecycleReasonCatalog ADD CONSTRAINT DF_BBVA_LifecycleReasonCatalog_Group DEFAULT N''OTHER'' FOR ReasonGroup;');

  DECLARE @ReasonGroupConstraint SYSNAME;
  SELECT TOP 1 @ReasonGroupConstraint=cc.name
  FROM sys.check_constraints cc
  WHERE cc.parent_object_id=OBJECT_ID(N'bbva.LifecycleReasonCatalog')
    AND cc.definition LIKE N'%ReasonGroup%';
  IF @ReasonGroupConstraint IS NOT NULL
  BEGIN
    DECLARE @DropReasonGroupConstraintSql NVARCHAR(MAX);
    SET @DropReasonGroupConstraintSql = N'ALTER TABLE bbva.LifecycleReasonCatalog DROP CONSTRAINT ' + QUOTENAME(@ReasonGroupConstraint) + N';';
    EXEC sys.sp_executesql @DropReasonGroupConstraintSql;
  END;
  EXEC(N'ALTER TABLE bbva.LifecycleReasonCatalog WITH CHECK ADD CONSTRAINT CK_BBVA_LifecycleReasonCatalog_Group CHECK (ReasonGroup IS NULL OR ReasonGroup IN (N''AVAILABLE'',N''UNASSIGNED'',N''BBVA_EXIT'',N''OTHER''));');

  EXEC sys.sp_executesql N'
    DECLARE @Actor NVARCHAR(255)=N''bbva-integrity-v10@local'';
    MERGE bbva.LifecycleReasonCatalog AS target
    USING (VALUES
      (N''AVAILABLE'', N''Sin proyecto / disponible para asignación'', N''AVAILABLE'', N''AVAILABLE'', 10),
      (N''UNASSIGNED_OTHER_ACCOUNT'', N''Desasignación a otra cuenta Softtek'', N''UNASSIGNED'', N''UNASSIGNED'', 20),
      (N''BBVA_EXIT_INTERNALIZATION'', N''Internalización'', N''UNASSIGNED'', N''BBVA_EXIT'', 30),
      (N''BBVA_EXIT_TECH_EXAM'', N''Reprobó examen tecnológico'', N''UNASSIGNED'', N''BBVA_EXIT'', 31),
      (N''BBVA_EXIT_SECURE_DEV_EXAM'', N''Reprobó examen de Desarrollo Seguro'', N''UNASSIGNED'', N''BBVA_EXIT'', 32),
      (N''BBVA_EXIT_NORMATIVE_EXAM'', N''Reprobó examen de Normativa'', N''UNASSIGNED'', N''BBVA_EXIT'', 33),
      (N''BBVA_EXIT_OTHER'', N''Otro motivo de baja de BBVA'', N''UNASSIGNED'', N''BBVA_EXIT'', 39),
      (N''OTHER'', N''Otro'', N''UNASSIGNED'', N''OTHER'', 100)
    ) AS source(Code,Name,DefaultTalentStage,ReasonGroup,SortOrder)
    ON target.Code=source.Code
    WHEN MATCHED THEN UPDATE SET
      Name=source.Name,DefaultTalentStage=source.DefaultTalentStage,ReasonGroup=source.ReasonGroup,
      Status=N''ACTIVE'',SortOrder=source.SortOrder,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@Actor
    WHEN NOT MATCHED THEN INSERT (Code,Name,DefaultTalentStage,ReasonGroup,Status,SortOrder,CreatedByEmail,UpdatedByEmail)
      VALUES (source.Code,source.Name,source.DefaultTalentStage,source.ReasonGroup,N''ACTIVE'',source.SortOrder,@Actor,@Actor);

    UPDATE bbva.LifecycleReasonCatalog
    SET Status=N''INACTIVE'',UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@Actor
    WHERE Code IN (N''BBVA_EXIT'',N''UNASSIGNED'');
  ';

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'bbva.TalentBankEntry') AND name=N'IX_BBVA_TalentBankEntry_RecordStatus'
  )
    EXEC(N'CREATE INDEX IX_BBVA_TalentBankEntry_RecordStatus ON bbva.TalentBankEntry(DeletedAt,Active,Stage) INCLUDE(PersonId,TalentType,AffiliationType,UpdatedAt);');

  COMMIT TRANSACTION;
  PRINT N'Migración V10 de integridad BBVA aplicada correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
