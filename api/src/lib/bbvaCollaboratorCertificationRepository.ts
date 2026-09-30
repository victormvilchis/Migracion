import sql from 'mssql';
import { getDbConnection } from './db.js';
import { BBVA_SQL_BUSINESS_DATE, bbvaBusinessDate } from './bbvaBusinessTime.js';
import { isCriticalTwoAttemptExhausted } from './bbvaCertificationRules.js';
import { deriveInitialCertificationSchedule } from './bbvaInitialCertificationSchedule.js';
import type {
  CertificationAttemptInput,
  CertificationAttemptUpdateInput,
  CertificationHistoryRecord,
  CertificationUpdateInput,
  CollaboratorCertificationAttemptRecord,
  CollaboratorCertificationDetail,
  CollaboratorCertificationListResult,
  CollaboratorCertificationRecord,
  CollaboratorCertificationSummary,
  CertificationTrackingRecord,
  CertificationCriticalResolutionInput,
} from './bbvaCollaboratorCertificationDomain.js';
import type {
  ImportCertificationCatalogConfig,
  ImportCertificationCurrentState,
  ParsedCertificationEvidence,
  ImportCertificationBlock,
} from './bbvaCollaboratorImportCertificationDomain.js';
import { importCertificationAttemptFingerprint, sameEffectiveImportCertificationState, sameImportCertificationAttemptEvidence } from './bbvaCollaboratorImportCertificationDomain.js';

const STATUS_CASE = `
  CASE
    WHEN pc.Applicable=0 OR pc.BaseStatus=N'NOT_APPLICABLE' THEN N'NOT_APPLICABLE'
    WHEN pc.BaseStatus=N'APPROVED' AND effectiveDates.EffectiveExpirationDate IS NOT NULL AND effectiveDates.EffectiveExpirationDate < ${BBVA_SQL_BUSINESS_DATE} AND cc.RecertificationEnabled=1 THEN N'RECERTIFICATION_PENDING'
    WHEN pc.BaseStatus=N'APPROVED' AND effectiveDates.EffectiveExpirationDate IS NOT NULL AND effectiveDates.EffectiveExpirationDate < ${BBVA_SQL_BUSINESS_DATE} THEN N'EXPIRED'
    WHEN pc.BaseStatus=N'APPROVED' AND effectiveDates.EffectiveExpirationDate IS NOT NULL AND cc.ExpiringSoonDays IS NOT NULL AND effectiveDates.EffectiveExpirationDate <= DATEADD(day,cc.ExpiringSoonDays,${BBVA_SQL_BUSINESS_DATE}) THEN N'EXPIRING'
    WHEN pc.BaseStatus=N'APPROVED' THEN N'VALID'
    WHEN pc.BaseStatus=N'FAILED' THEN N'FAILED'
    WHEN pc.BaseStatus=N'APPLIED' THEN N'APPLIED'
    WHEN pc.BaseStatus=N'SCHEDULED' THEN N'SCHEDULED'
    ELSE N'PENDING'
  END
`;

const BASE_SELECT = `
  SELECT
    CAST(pc.Id AS NVARCHAR(36)) AS id,
    CAST(c.Id AS NVARCHAR(36)) AS collaboratorId,
    CAST(pc.PersonId AS NVARCHAR(36)) AS personId,
    CAST(pc.CertificationId AS NVARCHAR(36)) AS certificationId,
    cc.Name AS certificationName,
    cc.CertificationType AS certificationType,
    cc.Provider AS provider,
    t.Name AS technologyName,
    pc.CertificationLevel AS certificationLevel,
    pc.Mandatory AS mandatory,
    pc.Applicable AS applicable,
    pc.Source AS source,
    CONVERT(VARCHAR(10),c.StartDate,23) AS bbvaStartDate,
    cc.InitialCompletionDays AS initialCompletionDays,
    CONVERT(VARCHAR(10),pc.InitialDueDate,23) AS initialDueDate,
    pc.ImportedCertificationStatus AS importedCertificationStatus,
    pc.ImportedExamStatus AS importedExamStatus,
    pc.LastScore10 AS lastScore10,
    cc.TracksScore AS tracksScore,
    pc.ImportedAttemptNumber AS importedAttemptNumber,
    pc.LastDataSource AS lastDataSource,
    pc.LastImportFingerprint AS lastImportFingerprint,
    CONVERT(VARCHAR(33),pc.LastImportedAt,127) AS lastImportedAt,
    pc.SofttekManagement AS softtekManagement,
    pc.CurrentCycle AS currentCycle,
    pc.BaseStatus AS baseStatus,
    latestAttempt.Result AS latestAttemptResult,
    ${STATUS_CASE} AS status,
    ISNULL(attemptStats.attemptCount,0) AS attemptCount,
    CONVERT(VARCHAR(10),pc.ApplicationDate,23) AS applicationDate,
    CONVERT(VARCHAR(10),pc.NextScheduledDate,23) AS scheduledDate,
    CONVERT(VARCHAR(10),effectiveDates.EffectiveApprovedDate,23) AS approvedDate,
    CONVERT(VARCHAR(10),effectiveDates.EffectiveExpirationDate,23) AS expirationDate,
    cc.ValidityMonths AS validityMonths,
    cc.ExpiringSoonDays AS expiringSoonDays,
    cc.MaxAttempts AS maxAttempts,
    cc.RecertificationEnabled AS recertificationEnabled,
    cc.RequiresAttempts AS requiresAttempts,
    cc.RequiresApplicationDate AS requiresApplicationDate,
    CASE WHEN pc.BaseStatus=N'FAILED' AND cc.RequiresAttempts=1 AND cc.MaxAttempts=2 AND cc.CertificationType IN (N'DEVELOPMENT_SECURITY',N'TECHNOLOGICAL',N'NORMATIVE_TESTING') AND latestAttempt.Result=N'FAILED' AND ISNULL(attemptStats.attemptCount,0) >= 2 AND ISNULL(criticalResolution.ResolutionStatus,N'PENDING_REVIEW')=N'PENDING_REVIEW' THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS criticalActionRequired,
    criticalResolution.ResolutionStatus AS criticalResolutionStatus,
    criticalResolution.Notes AS criticalResolutionNotes,
    CONVERT(VARCHAR(33),criticalResolution.UpdatedAt,127) AS criticalResolutionAt,
    pc.Notes AS notes,
    CONVERT(VARCHAR(33),pc.CreatedAt,127) AS createdAt,
    CONVERT(VARCHAR(33),pc.UpdatedAt,127) AS updatedAt
  FROM bbva.PersonCertification pc
  INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
  LEFT JOIN bbva.CatalogTechnology t ON t.Id=cc.TechnologyId
  INNER JOIN bbva.Person p ON p.Id=pc.PersonId
  INNER JOIN bbva.Collaborator c ON c.PersonId=pc.PersonId
  OUTER APPLY (
    SELECT TOP 1 r.ResolutionStatus,r.Notes,r.UpdatedAt
    FROM bbva.CertificationCriticalResolution r
    WHERE r.PersonCertificationId=pc.Id AND r.CycleNumber=pc.CurrentCycle
    ORDER BY r.UpdatedAt DESC,r.Id DESC
  ) criticalResolution
  OUTER APPLY (
    SELECT COUNT(1) AS attemptCount
    FROM bbva.PersonCertificationAttempt a
    WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle
  ) attemptStats
  OUTER APPLY (
    SELECT TOP 1 a.Result
    FROM bbva.PersonCertificationAttempt a
    WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle
    ORDER BY a.AttemptNumber DESC,a.CreatedAt DESC,a.Id DESC
  ) latestAttempt
  OUTER APPLY (
    SELECT MAX(a.ApplicationDate) AS LatestApprovedAttemptDate
    FROM bbva.PersonCertificationAttempt a
    WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle AND a.Result=N'APPROVED'
  ) latestApproval
  CROSS APPLY (
    SELECT
      CASE
        WHEN latestApproval.LatestApprovedAttemptDate IS NOT NULL
          AND (pc.ApprovedDate IS NULL OR latestApproval.LatestApprovedAttemptDate > pc.ApprovedDate)
          THEN latestApproval.LatestApprovedAttemptDate
        ELSE pc.ApprovedDate
      END AS EffectiveApprovedDate,
      CASE
        WHEN pc.BaseStatus=N'APPROVED'
          AND cc.ValidityMonths IS NOT NULL
          AND (CASE WHEN latestApproval.LatestApprovedAttemptDate IS NOT NULL AND (pc.ApprovedDate IS NULL OR latestApproval.LatestApprovedAttemptDate > pc.ApprovedDate) THEN latestApproval.LatestApprovedAttemptDate ELSE pc.ApprovedDate END) IS NOT NULL
          THEN DATEADD(month,cc.ValidityMonths,(CASE WHEN latestApproval.LatestApprovedAttemptDate IS NOT NULL AND (pc.ApprovedDate IS NULL OR latestApproval.LatestApprovedAttemptDate > pc.ApprovedDate) THEN latestApproval.LatestApprovedAttemptDate ELSE pc.ApprovedDate END))
        ELSE pc.ExpirationDate
      END AS EffectiveExpirationDate
  ) effectiveDates
`;

function toRecord(row: any): CollaboratorCertificationRecord {
  const currentCycle=Number(row.currentCycle);
  const attemptCount=Number(row.attemptCount);
  const initialCompletionDays=row.initialCompletionDays===null?null:Number(row.initialCompletionDays);
  const schedule=deriveInitialCertificationSchedule({
    bbvaStartDate:row.bbvaStartDate??null,
    initialCompletionDays,
    initialDueDate:row.initialDueDate??null,
    currentCycle,
    baseStatus:String(row.baseStatus??''),
    applicable:Boolean(row.applicable),
    requiresAttempts:Boolean(row.requiresAttempts),
    attemptCount,
    latestAttemptResult:row.latestAttemptResult??null,
  },bbvaBusinessDate());
  return {
    ...row,
    mandatory: Boolean(row.mandatory),
    applicable: Boolean(row.applicable),
    currentCycle,
    attemptCount,
    initialCompletionDays,
    firstAttemptDueDate:schedule.firstAttemptDueDate,
    initialDueDate:schedule.completionDueDate,
    initialSchedulePhase:schedule.phase,
    initialScheduleDueDate:schedule.dueDate,
    daysToInitialSchedule:schedule.daysRemaining,
    initialScheduleTiming:schedule.timing,
    validityMonths: row.validityMonths === null ? null : Number(row.validityMonths),
    expiringSoonDays: row.expiringSoonDays === null ? null : Number(row.expiringSoonDays),
    maxAttempts: row.maxAttempts === null ? null : Number(row.maxAttempts),
    lastScore10: row.lastScore10 === null ? null : Number(row.lastScore10),
    importedAttemptNumber: row.importedAttemptNumber === null ? null : Number(row.importedAttemptNumber),
    recertificationEnabled: Boolean(row.recertificationEnabled),
    requiresAttempts: Boolean(row.requiresAttempts),
    requiresApplicationDate: Boolean(row.requiresApplicationDate),
    tracksScore: Boolean(row.tracksScore),
    criticalActionRequired: Boolean(row.criticalActionRequired),
  } as CollaboratorCertificationRecord;
}

function summary(items: CollaboratorCertificationRecord[]): CollaboratorCertificationSummary {
  const applicableItems = items.filter((item) => item.applicable && item.status !== 'NOT_APPLICABLE');
  const valid = applicableItems.filter((item) => item.status === 'VALID').length;
  const expiring = applicableItems.filter((item) => item.status === 'EXPIRING').length;
  const expired = applicableItems.filter((item) => item.status === 'EXPIRED').length;
  const recertificationPending = applicableItems.filter((item) => item.status === 'RECERTIFICATION_PENDING').length;
  const failed = applicableItems.filter((item) => item.status === 'FAILED').length;
  const pending = applicableItems.filter((item) => ['PENDING', 'SCHEDULED', 'APPLIED'].includes(item.status)).length;
  const covered = valid + expiring;
  return {
    total: items.length,
    applicable: applicableItems.length,
    valid,
    expiring,
    expired,
    pending,
    failed,
    recertificationPending,
    coveragePercent: applicableItems.length ? Math.round((covered / applicableItems.length) * 10000) / 100 : 100,
  };
}

export class CollaboratorCertificationRepository {
  async synchronizeAllActive(actorEmail: string): Promise<void> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT CAST(Id AS NVARCHAR(36)) AS id
      FROM bbva.Collaborator
      WHERE Status=N'ACTIVE'
      ORDER BY CreatedAt ASC;
    `);
    for (const row of result.recordset as Array<{ id: string }>) {
      await this.synchronize(row.id, actorEmail);
    }
  }

  async collaboratorPersonId(collaboratorId: string): Promise<string | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, collaboratorId).query(`
      SELECT CAST(PersonId AS NVARCHAR(36)) AS personId FROM bbva.Collaborator WHERE Id=@id;
    `);
    return result.recordset[0]?.personId ? String(result.recordset[0].personId) : null;
  }

  async synchronize(collaboratorId: string, actorEmail: string): Promise<boolean> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const current = await new sql.Request(transaction).input('id', sql.UniqueIdentifier, collaboratorId).query(`
        SELECT c.Status AS collaboratorStatus, CAST(p.Id AS NVARCHAR(36)) AS personId,
               CAST(p.CurrentTechnologyCatalogId AS NVARCHAR(36)) AS technologyId,
               CONVERT(VARCHAR(10),c.StartDate,23) AS bbvaStartDate,
               UPPER(ISNULL(cp.Seniority,p.Expertise)) AS seniority
        FROM bbva.Collaborator c
        INNER JOIN bbva.Person p ON p.Id=c.PersonId
        LEFT JOIN bbva.CatalogProfile cp ON cp.Id=p.ProfileCatalogId
        WHERE c.Id=@id;
      `);
      const row = current.recordset[0] as { collaboratorStatus?: string; personId?: string; technologyId?: string | null; bbvaStartDate?: string | null; seniority?: string | null } | undefined;
      if (!row?.personId) {
        await transaction.rollback();
        return false;
      }

      await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, row.personId)
        .input('technologyId', sql.UniqueIdentifier, row.technologyId || null)
        .input('seniority', sql.NVarChar(16), row.seniority || null)
        .input('bbvaStartDate', sql.Date, row.bbvaStartDate || null)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          DECLARE @Applicable TABLE (CertificationId UNIQUEIDENTIFIER PRIMARY KEY, Mandatory BIT NOT NULL);

          INSERT INTO @Applicable (CertificationId,Mandatory)
          SELECT DISTINCT cc.Id,cc.DefaultMandatory
          FROM bbva.CertificationCatalog cc
          WHERE cc.Status=N'ACTIVE'
            AND (
              (cc.CertificationType=N'TECHNOLOGICAL' AND cc.TechnologyId IS NOT NULL AND cc.TechnologyId=@technologyId)
              OR cc.CertificationType<>N'TECHNOLOGICAL'
            )
            AND EXISTS (
              SELECT 1 FROM bbva.CertificationAllowedLevel al
              WHERE al.CertificationId=cc.Id
                AND (al.LevelCode=N'GENERIC' OR al.LevelCode=@seniority)
            );

          INSERT INTO bbva.PersonCertification (
            PersonId,CertificationId,CertificationLevel,Applicable,Mandatory,Source,CurrentCycle,BaseStatus,InitialDueDate,CreatedByEmail,UpdatedByEmail
          )
          SELECT @personId,a.CertificationId,CASE WHEN cc.CertificationType=N'TECHNOLOGICAL' THEN @seniority ELSE N'GENERIC' END,1,a.Mandatory,N'AUTO',1,N'PENDING',CASE WHEN @bbvaStartDate IS NOT NULL AND cc.InitialCompletionDays IS NOT NULL THEN DATEADD(day,cc.InitialCompletionDays,@bbvaStartDate) ELSE NULL END,@actorEmail,@actorEmail
          FROM @Applicable a
          INNER JOIN bbva.CertificationCatalog cc ON cc.Id=a.CertificationId
          WHERE NOT EXISTS (
            SELECT 1 FROM bbva.PersonCertification pc
            WHERE pc.PersonId=@personId AND pc.CertificationId=a.CertificationId
          );

          INSERT INTO bbva.PersonCertificationHistory (PersonCertificationId,EventType,Description,CreatedByEmail)
          SELECT pc.Id,N'ASSIGNED',N'Certificación incorporada por las reglas de aplicabilidad vigentes.',@actorEmail
          FROM bbva.PersonCertification pc
          INNER JOIN @Applicable a ON a.CertificationId=pc.CertificationId
          WHERE pc.PersonId=@personId
            AND pc.CreatedByEmail=@actorEmail
            AND NOT EXISTS (
              SELECT 1 FROM bbva.PersonCertificationHistory h
              WHERE h.PersonCertificationId=pc.Id
            );

          UPDATE pc
          SET Applicable=1,
              Mandatory=a.Mandatory,
              CertificationLevel=CASE WHEN cc.CertificationType=N'TECHNOLOGICAL' THEN @seniority ELSE N'GENERIC' END,
              InitialDueDate=CASE WHEN pc.CurrentCycle=1 AND pc.ApprovedDate IS NULL AND ISNULL(pc.LastDataSource,N'AUTO')<>N'IMPORT' AND @bbvaStartDate IS NOT NULL AND cc.InitialCompletionDays IS NOT NULL THEN DATEADD(day,cc.InitialCompletionDays,@bbvaStartDate) ELSE pc.InitialDueDate END,
              UpdatedAt=SYSUTCDATETIME(),
              UpdatedByEmail=@actorEmail
          FROM bbva.PersonCertification pc
          INNER JOIN @Applicable a ON a.CertificationId=pc.CertificationId
          INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
          WHERE pc.PersonId=@personId
            AND pc.Source=N'AUTO'
            AND pc.BaseStatus<>N'NOT_APPLICABLE';

          UPDATE pc
          SET Applicable=0,
              UpdatedAt=SYSUTCDATETIME(),
              UpdatedByEmail=@actorEmail
          FROM bbva.PersonCertification pc
          WHERE pc.PersonId=@personId
            AND pc.Source=N'AUTO'
            AND pc.BaseStatus<>N'NOT_APPLICABLE'
            AND NOT EXISTS (SELECT 1 FROM @Applicable a WHERE a.CertificationId=pc.CertificationId);
        `);

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async list(collaboratorId: string): Promise<CollaboratorCertificationListResult | null> {
    const personId = await this.collaboratorPersonId(collaboratorId);
    if (!personId) return null;
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, collaboratorId).query(`
      ${BASE_SELECT}
      WHERE c.Id=@id
      ORDER BY pc.Applicable DESC, cc.Name ASC;
    `);
    const items = (result.recordset as any[]).map(toRecord);
    return { items, summary: summary(items) };
  }

  async detail(collaboratorId: string, recordId: string): Promise<CollaboratorCertificationDetail | null> {
    const pool = await getDbConnection();
    const itemResult = await pool.request()
      .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
      .input('recordId', sql.UniqueIdentifier, recordId)
      .query(`${BASE_SELECT} WHERE c.Id=@collaboratorId AND pc.Id=@recordId;`);
    const raw = itemResult.recordset[0];
    if (!raw) return null;
    const item = toRecord(raw);

    const attempts = await pool.request().input('recordId', sql.UniqueIdentifier, recordId).query(`
      SELECT CAST(a.Id AS NVARCHAR(36)) AS id,
             CAST(a.PersonCertificationId AS NVARCHAR(36)) AS certificationRecordId,
             a.CycleNumber AS cycleNumber,a.AttemptNumber AS attemptNumber,
             CONVERT(VARCHAR(10),a.ApplicationDate,23) AS applicationDate,
             a.Result AS result,a.Notes AS notes,
             a.Score10 AS score10,a.Source AS source,a.ImportFingerprint AS importFingerprint,
             CONVERT(VARCHAR(33),a.CreatedAt,127) AS createdAt,a.CreatedByEmail AS createdByEmail,
             CONVERT(VARCHAR(33),a.UpdatedAt,127) AS updatedAt,a.UpdatedByEmail AS updatedByEmail
      FROM bbva.PersonCertificationAttempt a
      WHERE a.PersonCertificationId=@recordId
      ORDER BY a.CycleNumber DESC,a.AttemptNumber DESC;
    `);
    const history = await pool.request().input('recordId', sql.UniqueIdentifier, recordId).query(`
      SELECT CAST(h.Id AS NVARCHAR(36)) AS id,
             CAST(h.PersonCertificationId AS NVARCHAR(36)) AS certificationRecordId,
             h.EventType AS eventType,h.Description AS description,h.Source AS source,
             CONVERT(VARCHAR(33),h.CreatedAt,127) AS createdAt,h.CreatedByEmail AS createdByEmail
      FROM bbva.PersonCertificationHistory h
      WHERE h.PersonCertificationId=@recordId
      ORDER BY h.CreatedAt DESC;
    `);

    return {
      item,
      attempts: attempts.recordset.map((row: any) => ({
        ...row,
        cycleNumber: Number(row.cycleNumber),
        attemptNumber: Number(row.attemptNumber),
        score10: row.score10 === null ? null : Number(row.score10),
      })) as CollaboratorCertificationAttemptRecord[],
      history: history.recordset as CertificationHistoryRecord[],
    };
  }

  async addManual(collaboratorId: string, certificationId: string, certificationLevel: string | null, actorEmail: string): Promise<CollaboratorCertificationRecord | null> {
    const personId = await this.collaboratorPersonId(collaboratorId);
    if (!personId) return null;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const catalog = await new sql.Request(transaction)
        .input('certificationId', sql.UniqueIdentifier, certificationId)
        .query(`SELECT DefaultMandatory AS mandatory,Status AS status,CertificationType AS certificationType
                FROM bbva.CertificationCatalog WHERE Id=@certificationId;
                SELECT LevelCode FROM bbva.CertificationAllowedLevel WHERE CertificationId=@certificationId;`);
      const catalogRow = catalog.recordsets[0]?.[0] as { mandatory?: boolean; status?: string; certificationType?: string } | undefined;
      if (!catalogRow) throw Object.assign(new Error('La certificación no existe.'), { statusCode: 404 });
      if (String(catalogRow.status) !== 'ACTIVE') throw Object.assign(new Error('La certificación está inactiva.'), { statusCode: 409 });
      const allowedLevels = new Set((catalog.recordsets[1] ?? []).map((row:any)=>String(row.LevelCode)));
      const selectedLevel = String(catalogRow.certificationType) === 'TECHNOLOGICAL' ? String(certificationLevel ?? '').toUpperCase() : 'GENERIC';
      if (String(catalogRow.certificationType) === 'TECHNOLOGICAL' && (!selectedLevel || !allowedLevels.has(selectedLevel))) {
        throw Object.assign(new Error('Selecciona un nivel válido para la certificación tecnológica.'), { statusCode: 400 });
      }

      const existing = await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('certificationId', sql.UniqueIdentifier, certificationId)
        .query(`SELECT CAST(Id AS NVARCHAR(36)) AS id FROM bbva.PersonCertification WHERE PersonId=@personId AND CertificationId=@certificationId;`);

      let recordId: string;
      if (existing.recordset[0]?.id) {
        recordId = String(existing.recordset[0].id);
        await new sql.Request(transaction)
          .input('id', sql.UniqueIdentifier, recordId)
          .input('mandatory', sql.Bit, Boolean(catalogRow.mandatory))
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .input('certificationLevel',sql.NVarChar(16),selectedLevel)
          .query(`UPDATE bbva.PersonCertification SET Applicable=1,Mandatory=@mandatory,CertificationLevel=@certificationLevel,Source=N'MANUAL',LastDataSource=N'MANUAL',BaseStatus=CASE WHEN BaseStatus=N'NOT_APPLICABLE' THEN N'PENDING' ELSE BaseStatus END,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@id;`);
      } else {
        const created = await new sql.Request(transaction)
          .input('personId', sql.UniqueIdentifier, personId)
          .input('certificationId', sql.UniqueIdentifier, certificationId)
          .input('mandatory', sql.Bit, Boolean(catalogRow.mandatory))
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .input('certificationLevel',sql.NVarChar(16),selectedLevel)
          .query(`INSERT INTO bbva.PersonCertification(PersonId,CertificationId,CertificationLevel,Applicable,Mandatory,Source,CurrentCycle,BaseStatus,CreatedByEmail,UpdatedByEmail)
                  OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id
                  VALUES(@personId,@certificationId,@certificationLevel,1,@mandatory,N'MANUAL',1,N'PENDING',@actorEmail,@actorEmail);`);
        recordId = String(created.recordset[0].id);
      }

      await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail)
                VALUES(@recordId,N'MANUAL_ASSIGNMENT',N'Certificación agregada manualmente al colaborador.',@actorEmail);`);
      await transaction.commit();
      const detail = await this.detail(collaboratorId, recordId);
      return detail?.item ?? null;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(collaboratorId: string, recordId: string, input: CertificationUpdateInput, actorEmail: string): Promise<CollaboratorCertificationRecord | null> {
    const current = await this.detail(collaboratorId, recordId);
    if (!current) return null;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const state = await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .query(`
          SELECT pc.BaseStatus AS baseStatus,cc.CertificationType AS certificationType,cc.RequiresAttempts AS requiresAttempts,cc.MaxAttempts AS maxAttempts,
                 attemptStats.attemptCount,latestAttempt.Result AS latestAttemptResult
          FROM bbva.PersonCertification pc WITH (UPDLOCK,HOLDLOCK)
          INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
          OUTER APPLY (
            SELECT COUNT(1) AS attemptCount FROM bbva.PersonCertificationAttempt a
            WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle
          ) attemptStats
          OUTER APPLY (
            SELECT TOP 1 a.Result FROM bbva.PersonCertificationAttempt a
            WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle
            ORDER BY a.AttemptNumber DESC,a.CreatedAt DESC,a.Id DESC
          ) latestAttempt
          WHERE pc.Id=@recordId;
        `);
      const row = state.recordset[0] as any;
      if (!row) {
        await transaction.rollback();
        return null;
      }
      if (input.scheduledDate && String(row.baseStatus) === 'FAILED' && Boolean(row.requiresAttempts) && isCriticalTwoAttemptExhausted({
        certificationType: String(row.certificationType ?? ''),
        maxAttempts: row.maxAttempts === null || row.maxAttempts === undefined ? null : Number(row.maxAttempts),
        attemptCount: Number(row.attemptCount ?? 0),
        latestAttemptResult: String(row.latestAttemptResult ?? ''),
      })) {
        throw Object.assign(new Error('La certificación agotó sus 2/2 intentos. No se puede programar otra presentación en el mismo ciclo.'), { statusCode: 409, code: 'MAX_ATTEMPTS_REACHED' });
      }

      await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('scheduledDate', sql.Date, input.scheduledDate)
        .input('notes', sql.NVarChar(1500), input.notes)
        .input('mandatory', sql.Bit, input.mandatory)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.PersonCertification
          SET NextScheduledDate=@scheduledDate,Notes=@notes,Mandatory=@mandatory,LastDataSource=N'MANUAL',
              BaseStatus=CASE
                WHEN BaseStatus IN (N'PENDING',N'FAILED',N'APPLIED') AND @scheduledDate IS NOT NULL THEN N'SCHEDULED'
                WHEN BaseStatus=N'SCHEDULED' AND @scheduledDate IS NULL THEN N'PENDING'
                ELSE BaseStatus
              END,
              UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
          WHERE Id=@recordId;
          INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,Source,CreatedByEmail)
          VALUES(@recordId,CASE WHEN @scheduledDate IS NULL THEN N'EXAM_SCHEDULE_CLEARED' ELSE N'EXAM_SCHEDULED' END,
                 CASE WHEN @scheduledDate IS NULL THEN N'Se eliminó la fecha programada de presentación.' ELSE CONCAT(N'Examen programado para ',CONVERT(NVARCHAR(10),@scheduledDate,23),N'.') END,
                 N'MANUAL',@actorEmail);
        `);
      await transaction.commit();
      return (await this.detail(collaboratorId, recordId))?.item ?? null;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async addAttempt(collaboratorId: string, recordId: string, input: CertificationAttemptInput, actorEmail: string): Promise<CollaboratorCertificationDetail | null> {
    const current = await this.detail(collaboratorId, recordId);
    if (!current) return null;
    if (!current.item.applicable) throw Object.assign(new Error('La certificación no está marcada como aplicable.'), { statusCode: 409 });
    if (current.item.baseStatus === 'APPROVED') {
      throw Object.assign(new Error('El ciclo actual ya está aprobado. Para registrar una nueva presentación inicia primero la recertificación.'), { statusCode: 409 });
    }

    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const lockedState = await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .query(`
          SELECT pc.CurrentCycle AS currentCycle,pc.Applicable AS applicable,pc.BaseStatus AS baseStatus,
                 cc.ValidityMonths,cc.RequiresApplicationDate,cc.RequiresAttempts,cc.MaxAttempts,cc.CertificationType
          FROM bbva.PersonCertification pc WITH (UPDLOCK,HOLDLOCK)
          INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
          WHERE pc.Id=@recordId;
        `);
      const config = lockedState.recordset[0] as any;
      if (!config) {
        await transaction.rollback();
        return null;
      }
      if (!Boolean(config.applicable)) throw Object.assign(new Error('La certificación no está marcada como aplicable.'), { statusCode: 409 });
      if (String(config.baseStatus).toUpperCase() === 'APPROVED') {
        throw Object.assign(new Error('El ciclo actual ya está aprobado. Para registrar una nueva presentación inicia primero la recertificación.'), { statusCode: 409 });
      }
      if (config?.RequiresApplicationDate && !input.applicationDate) {
        throw Object.assign(new Error('La fecha de aplicación es obligatoria para esta certificación.'), { statusCode: 400 });
      }

      const cycle = Number(config.CurrentCycle ?? config.currentCycle);
      const count = await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('cycle', sql.Int, cycle)
        .query(`SELECT COUNT(1) AS total FROM bbva.PersonCertificationAttempt WHERE PersonCertificationId=@recordId AND CycleNumber=@cycle;`);
      const attemptsUsed = Number(count.recordset[0]?.total ?? 0);
      const maxAttempts = config?.MaxAttempts === null || config?.MaxAttempts === undefined ? null : Number(config.MaxAttempts);
      if (Boolean(config?.RequiresAttempts) && maxAttempts !== null && attemptsUsed >= maxAttempts) {
        throw Object.assign(new Error(`La certificación ya alcanzó el máximo configurado de ${maxAttempts} intento${maxAttempts === 1 ? '' : 's'} para este ciclo.`), { statusCode: 409, code: 'MAX_ATTEMPTS_REACHED' });
      }
      const attemptNumber = attemptsUsed + 1;
      const approvedDate = input.result === 'APPROVED' ? (input.applicationDate || bbvaBusinessDate()) : null;

      await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('cycle', sql.Int, cycle)
        .input('attemptNumber', sql.Int, attemptNumber)
        .input('applicationDate', sql.Date, input.applicationDate)
        .input('result', sql.NVarChar(16), input.result)
        .input('score10', sql.Decimal(5,2), input.score10)
        .input('notes', sql.NVarChar(1000), input.notes)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO bbva.PersonCertificationAttempt(
            PersonCertificationId,CycleNumber,AttemptNumber,ApplicationDate,Result,Score10,Notes,CreatedByEmail
          ) VALUES(@recordId,@cycle,@attemptNumber,@applicationDate,@result,@score10,@notes,@actorEmail);
        `);

      await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('applicationDate', sql.Date, input.applicationDate)
        .input('approvedDate', sql.Date, approvedDate)
        .input('validityMonths', sql.Int, config?.ValidityMonths ?? null)
        .input('result', sql.NVarChar(16), input.result)
        .input('score10', sql.Decimal(5,2), input.score10)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.PersonCertification
          SET ApplicationDate=COALESCE(@applicationDate,ApplicationDate),
              BaseStatus=CASE WHEN @result=N'APPROVED' THEN N'APPROVED' WHEN @result=N'FAILED' THEN N'FAILED' WHEN @applicationDate IS NOT NULL THEN N'APPLIED' ELSE N'SCHEDULED' END,
              ApprovedDate=CASE WHEN @result=N'APPROVED' THEN @approvedDate ELSE ApprovedDate END,
              ExpirationDate=CASE WHEN @result=N'APPROVED' AND @validityMonths IS NOT NULL THEN DATEADD(month,@validityMonths,@approvedDate)
                                  WHEN @result=N'APPROVED' THEN NULL ELSE ExpirationDate END,
              LastScore10=@score10,NextScheduledDate=NULL,LastDataSource=N'MANUAL',UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
          WHERE Id=@recordId;
        `);

      const description = input.result === 'APPROVED'
        ? `Intento ${attemptNumber} aprobado.`
        : input.result === 'FAILED'
          ? `Intento ${attemptNumber} reprobado.`
          : `Intento ${attemptNumber} registrado.`;
      await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('description', sql.NVarChar(600), description)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail)
                VALUES(@recordId,N'ATTEMPT',@description,@actorEmail);`);

      const criticalTwoAttemptFailure = Boolean(config?.RequiresAttempts) && isCriticalTwoAttemptExhausted({
        certificationType: String(config?.CertificationType ?? ''),
        maxAttempts: config?.MaxAttempts === null || config?.MaxAttempts === undefined ? null : Number(config.MaxAttempts),
        attemptCount: attemptNumber,
        latestAttemptResult: input.result,
      });
      if (criticalTwoAttemptFailure) {
        await new sql.Request(transaction)
          .input('recordId', sql.UniqueIdentifier, recordId)
          .input('cycle', sql.Int, cycle)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`
            MERGE bbva.CertificationCriticalResolution AS target
            USING (SELECT @recordId AS PersonCertificationId,@cycle AS CycleNumber) AS source
            ON target.PersonCertificationId=source.PersonCertificationId AND target.CycleNumber=source.CycleNumber
            WHEN NOT MATCHED THEN
              INSERT(PersonCertificationId,CycleNumber,ResolutionStatus,CreatedByEmail,UpdatedByEmail)
              VALUES(@recordId,@cycle,N'PENDING_REVIEW',@actorEmail,@actorEmail);

            IF NOT EXISTS (
              SELECT 1 FROM bbva.PersonCertificationHistory
              WHERE PersonCertificationId=@recordId AND EventType=N'CRITICAL_REVIEW_REQUIRED'
                AND Description=CONCAT(N'Ciclo ',@cycle,N': 2/2 intentos agotados; requiere resolver baja o becario.')
            )
              INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail)
              VALUES(@recordId,N'CRITICAL_REVIEW_REQUIRED',CONCAT(N'Ciclo ',@cycle,N': 2/2 intentos agotados; requiere resolver baja o becario.'),@actorEmail);
          `);
      }

      await transaction.commit();
      return this.detail(collaboratorId, recordId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }


  async updateAttempt(collaboratorId: string, recordId: string, attemptId: string, input: CertificationAttemptUpdateInput, actorEmail: string): Promise<CollaboratorCertificationDetail | null> {
    const current = await this.detail(collaboratorId, recordId);
    if (!current) return null;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const state = await new sql.Request(transaction)
        .input('recordId',sql.UniqueIdentifier,recordId)
        .input('attemptId',sql.UniqueIdentifier,attemptId)
        .query(`
          SELECT pc.CurrentCycle currentCycle,pc.Applicable applicable,cc.ValidityMonths validityMonths,cc.RequiresApplicationDate requiresApplicationDate,
                 cc.RequiresAttempts requiresAttempts,cc.MaxAttempts maxAttempts,cc.CertificationType certificationType,cc.TracksScore tracksScore,
                 a.CycleNumber cycleNumber,a.AttemptNumber currentAttemptNumber
          FROM bbva.PersonCertification pc WITH (UPDLOCK,HOLDLOCK)
          INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
          INNER JOIN bbva.PersonCertificationAttempt a WITH (UPDLOCK,HOLDLOCK) ON a.PersonCertificationId=pc.Id AND a.Id=@attemptId
          WHERE pc.Id=@recordId;
        `);
      const row=state.recordset[0] as any;
      if(!row){await transaction.rollback();return null;}
      if(!Boolean(row.applicable)) throw Object.assign(new Error('La certificación no está marcada como aplicable.'),{statusCode:409});
      if(Number(row.cycleNumber)!==Number(row.currentCycle)) throw Object.assign(new Error('Sólo se pueden modificar intentos del ciclo actual.'),{statusCode:409});
      if(row.maxAttempts!==null && Number(input.attemptNumber)>Number(row.maxAttempts)) throw Object.assign(new Error(`El intento no puede ser mayor a ${row.maxAttempts}.`),{statusCode:400});
      if(Boolean(row.requiresApplicationDate) && !input.applicationDate) throw Object.assign(new Error('La fecha de aplicación es obligatoria para este intento.'),{statusCode:400});
      const duplicate=await new sql.Request(transaction).input('recordId',sql.UniqueIdentifier,recordId).input('attemptId',sql.UniqueIdentifier,attemptId).input('cycle',sql.Int,row.currentCycle).input('attemptNumber',sql.Int,input.attemptNumber).query(`SELECT TOP 1 1 found FROM bbva.PersonCertificationAttempt WHERE PersonCertificationId=@recordId AND CycleNumber=@cycle AND AttemptNumber=@attemptNumber AND Id<>@attemptId;`);
      if(duplicate.recordset[0]) throw Object.assign(new Error('Ya existe otro intento con ese número en el ciclo actual.'),{statusCode:409});
      const resolution=await new sql.Request(transaction).input('recordId',sql.UniqueIdentifier,recordId).input('cycle',sql.Int,row.currentCycle).query(`SELECT TOP 1 ResolutionStatus status FROM bbva.CertificationCriticalResolution WHERE PersonCertificationId=@recordId AND CycleNumber=@cycle ORDER BY UpdatedAt DESC,Id DESC;`);
      if(resolution.recordset[0]?.status && String(resolution.recordset[0].status)!=='PENDING_REVIEW') throw Object.assign(new Error('El intento no puede modificarse después de resolver el caso crítico del ciclo.'),{statusCode:409});
      await new sql.Request(transaction).input('attemptId',sql.UniqueIdentifier,attemptId).input('attemptNumber',sql.Int,input.attemptNumber).input('applicationDate',sql.Date,input.applicationDate).input('result',sql.NVarChar(24),input.result).input('score10',sql.Decimal(5,2),input.score10).input('notes',sql.NVarChar(1000),input.notes).input('actor',sql.NVarChar(320),actorEmail).query(`UPDATE bbva.PersonCertificationAttempt SET AttemptNumber=@attemptNumber,ApplicationDate=@applicationDate,Result=@result,Score10=@score10,Notes=@notes,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actor WHERE Id=@attemptId;`);
      const aggregate=await new sql.Request(transaction).input('recordId',sql.UniqueIdentifier,recordId).input('cycle',sql.Int,row.currentCycle).query(`
        SELECT TOP 1 AttemptNumber,ApplicationDate,Result,Score10 FROM bbva.PersonCertificationAttempt WHERE PersonCertificationId=@recordId AND CycleNumber=@cycle ORDER BY AttemptNumber DESC,CreatedAt DESC,Id DESC;
        SELECT MAX(ApplicationDate) approvedDate FROM bbva.PersonCertificationAttempt WHERE PersonCertificationId=@recordId AND CycleNumber=@cycle AND Result=N'APPROVED';
        SELECT COUNT(1) attemptCount FROM bbva.PersonCertificationAttempt WHERE PersonCertificationId=@recordId AND CycleNumber=@cycle;
      `);
      const latest=aggregate.recordsets[0]?.[0] as any;
      const approvedDate=aggregate.recordsets[1]?.[0]?.approvedDate??null;
      const attemptCount=Number(aggregate.recordsets[2]?.[0]?.attemptCount??0);
      const baseStatus=approvedDate?'APPROVED':latest?.Result==='FAILED'?'FAILED':latest?.ApplicationDate?'APPLIED':'PENDING';
      await new sql.Request(transaction).input('recordId',sql.UniqueIdentifier,recordId).input('baseStatus',sql.NVarChar(24),baseStatus).input('applicationDate',sql.Date,latest?.ApplicationDate??null).input('approvedDate',sql.Date,approvedDate).input('validityMonths',sql.Int,row.validityMonths).input('score10',sql.Decimal(5,2),latest?.Score10??null).input('actor',sql.NVarChar(320),actorEmail).query(`UPDATE bbva.PersonCertification SET BaseStatus=@baseStatus,ApplicationDate=@applicationDate,ApprovedDate=@approvedDate,ExpirationDate=CASE WHEN @approvedDate IS NOT NULL AND @validityMonths IS NOT NULL THEN DATEADD(month,@validityMonths,@approvedDate) ELSE NULL END,LastScore10=@score10,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actor WHERE Id=@recordId;`);

      const criticalAfterEdit=Boolean(row.requiresAttempts) && isCriticalTwoAttemptExhausted({
        certificationType:String(row.certificationType??''),
        maxAttempts:row.maxAttempts===null||row.maxAttempts===undefined?null:Number(row.maxAttempts),
        attemptCount,
        latestAttemptResult:String(latest?.Result??''),
      }) && baseStatus==='FAILED';
      if(criticalAfterEdit){
        await new sql.Request(transaction).input('recordId',sql.UniqueIdentifier,recordId).input('cycle',sql.Int,row.currentCycle).input('actor',sql.NVarChar(320),actorEmail).query(`
          MERGE bbva.CertificationCriticalResolution AS target
          USING (SELECT @recordId AS PersonCertificationId,@cycle AS CycleNumber) source
          ON target.PersonCertificationId=source.PersonCertificationId AND target.CycleNumber=source.CycleNumber
          WHEN NOT MATCHED THEN INSERT(PersonCertificationId,CycleNumber,ResolutionStatus,CreatedByEmail,UpdatedByEmail) VALUES(@recordId,@cycle,N'PENDING_REVIEW',@actor,@actor);
          IF NOT EXISTS(SELECT 1 FROM bbva.PersonCertificationHistory WHERE PersonCertificationId=@recordId AND EventType=N'CRITICAL_REVIEW_REQUIRED' AND Description=CONCAT(N'Ciclo ',@cycle,N': 2/2 intentos agotados; requiere resolver baja o becario.'))
            INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail) VALUES(@recordId,N'CRITICAL_REVIEW_REQUIRED',CONCAT(N'Ciclo ',@cycle,N': 2/2 intentos agotados; requiere resolver baja o becario.'),@actor);
        `);
      }else{
        await new sql.Request(transaction).input('recordId',sql.UniqueIdentifier,recordId).input('cycle',sql.Int,row.currentCycle).input('actor',sql.NVarChar(320),actorEmail).query(`
          DELETE FROM bbva.CertificationCriticalResolution WHERE PersonCertificationId=@recordId AND CycleNumber=@cycle AND ResolutionStatus=N'PENDING_REVIEW';
          IF @@ROWCOUNT>0 INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail) VALUES(@recordId,N'CRITICAL_REVIEW_CLEARED',CONCAT(N'Ciclo ',@cycle,N': la edición del intento eliminó la condición crítica 2/2 pendiente.'),@actor);
        `);
      }
      await new sql.Request(transaction).input('recordId',sql.UniqueIdentifier,recordId).input('attemptNumber',sql.Int,input.attemptNumber).input('actor',sql.NVarChar(320),actorEmail).query(`INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail) VALUES(@recordId,N'ATTEMPT_EDITED',CONCAT(N'Intento ',@attemptNumber,N' del ciclo actual modificado manualmente.'),@actor);`);
      await transaction.commit();return this.detail(collaboratorId,recordId);
    }catch(error){await transaction.rollback();throw error;}
  }

  async resolveCritical(
    collaboratorId: string,
    recordId: string,
    input: CertificationCriticalResolutionInput,
    actorEmail: string,
  ): Promise<CollaboratorCertificationRecord | null> {
    const current = await this.detail(collaboratorId, recordId);
    if (!current) return null;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const state = await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('cycle', sql.Int, current.item.currentCycle)
        .query(`
          SELECT cc.CertificationType AS certificationType,cc.RequiresAttempts AS requiresAttempts,cc.MaxAttempts AS maxAttempts,
                 pc.BaseStatus AS baseStatus,
                 (SELECT COUNT(1) FROM bbva.PersonCertificationAttempt a WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=@cycle) AS attemptCount,
                 latestAttempt.Result AS latestAttemptResult,
        cc.TracksScore AS tracksScore,
                 resolution.ResolutionStatus AS currentResolutionStatus
          FROM bbva.PersonCertification pc
          INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
          OUTER APPLY (
            SELECT TOP 1 a.Result FROM bbva.PersonCertificationAttempt a
            WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=@cycle
            ORDER BY a.AttemptNumber DESC,a.CreatedAt DESC,a.Id DESC
          ) latestAttempt
          OUTER APPLY (
            SELECT TOP 1 r.ResolutionStatus FROM bbva.CertificationCriticalResolution r
            WHERE r.PersonCertificationId=pc.Id AND r.CycleNumber=@cycle
          ) resolution
          WHERE pc.Id=@recordId;
        `);
      const row = state.recordset[0] as any;
      const isCritical = Boolean(row)
        && String(row.baseStatus) === 'FAILED'
        && Boolean(row.requiresAttempts)
        && isCriticalTwoAttemptExhausted({
          certificationType: String(row.certificationType ?? ''),
          maxAttempts: row.maxAttempts === null || row.maxAttempts === undefined ? null : Number(row.maxAttempts),
          attemptCount: Number(row.attemptCount),
          latestAttemptResult: String(row.latestAttemptResult ?? ''),
        });
      if (!isCritical) {
        throw Object.assign(new Error('La certificación no se encuentra en un caso crítico 2/2 pendiente de resolución.'), { statusCode: 409, code: 'CRITICAL_RESOLUTION_NOT_APPLICABLE' });
      }
      if (String(row.currentResolutionStatus ?? 'PENDING_REVIEW') === 'LOW_CONFIRMED') {
        throw Object.assign(new Error('La baja ya fue confirmada mediante el ciclo de vida de la persona.'), { statusCode: 409, code: 'CRITICAL_RESOLUTION_CLOSED' });
      }

      const resolvedAt = input.resolution === 'INTERN' ? new Date() : null;
      await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('cycle', sql.Int, current.item.currentCycle)
        .input('status', sql.NVarChar(24), input.resolution)
        .input('notes', sql.NVarChar(1000), input.notes)
        .input('resolvedAt', sql.DateTime2, resolvedAt)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          MERGE bbva.CertificationCriticalResolution AS target
          USING (SELECT @recordId AS PersonCertificationId,@cycle AS CycleNumber) AS source
          ON target.PersonCertificationId=source.PersonCertificationId AND target.CycleNumber=source.CycleNumber
          WHEN MATCHED THEN UPDATE SET ResolutionStatus=@status,Notes=@notes,ResolvedAt=@resolvedAt,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
          WHEN NOT MATCHED THEN INSERT(PersonCertificationId,CycleNumber,ResolutionStatus,Notes,ResolvedAt,CreatedByEmail,UpdatedByEmail)
            VALUES(@recordId,@cycle,@status,@notes,@resolvedAt,@actorEmail,@actorEmail);

          INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail)
          VALUES(@recordId,N'CRITICAL_RESOLUTION',
            CASE @status WHEN N'LOW_REQUESTED' THEN CONCAT(N'Ciclo ',@cycle,N': se solicitó gestionar la baja.') ELSE CONCAT(N'Ciclo ',@cycle,N': se resolvió continuar como becario.') END,
            @actorEmail);
        `);
      await transaction.commit();
      return (await this.detail(collaboratorId, recordId))?.item ?? null;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async recertify(collaboratorId: string, recordId: string, actorEmail: string): Promise<CollaboratorCertificationRecord | null> {
    const current = await this.detail(collaboratorId, recordId);
    if (!current) return null;
    if (!current.item.recertificationEnabled) throw Object.assign(new Error('Esta certificación no tiene recertificación habilitada.'), { statusCode: 409 });
    if (!['VALID', 'EXPIRING', 'EXPIRED', 'RECERTIFICATION_PENDING'].includes(current.item.status)) {
      throw Object.assign(new Error('La certificación todavía no está lista para iniciar un ciclo de recertificación.'), { statusCode: 409 });
    }
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const updated = await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('currentCycle', sql.Int, current.item.currentCycle)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.PersonCertification
          SET CurrentCycle=CurrentCycle+1,BaseStatus=N'PENDING',ApplicationDate=NULL,NextScheduledDate=NULL,ApprovedDate=NULL,ExpirationDate=NULL,
              Applicable=1,LastDataSource=N'MANUAL',UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
          WHERE Id=@recordId AND CurrentCycle=@currentCycle AND BaseStatus=N'APPROVED';
        `);
      if ((updated.rowsAffected[0] ?? 0) !== 1) {
        throw Object.assign(new Error('La certificación cambió de ciclo en otra operación. Actualiza la pantalla antes de reintentar.'), { statusCode: 409, code: 'CERTIFICATION_CONCURRENCY_CONFLICT' });
      }
      await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail)
          VALUES(@recordId,N'RECERTIFICATION_STARTED',N'Se inició un nuevo ciclo de recertificación.',@actorEmail);
        `);
      await transaction.commit();
      return (await this.detail(collaboratorId, recordId))?.item ?? null;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async markNotApplicable(collaboratorId: string, recordId: string, actorEmail: string): Promise<CollaboratorCertificationRecord | null> {
    const current = await this.detail(collaboratorId, recordId);
    if (!current) return null;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const state = await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .query(`
          SELECT pc.Applicable AS applicable,pc.BaseStatus AS baseStatus,cc.CertificationType AS certificationType,cc.RequiresAttempts AS requiresAttempts,cc.MaxAttempts AS maxAttempts,
                 attemptStats.attemptCount,latestAttempt.Result AS latestAttemptResult,resolution.ResolutionStatus AS resolutionStatus
          FROM bbva.PersonCertification pc WITH (UPDLOCK,HOLDLOCK)
          INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
          OUTER APPLY (SELECT COUNT(1) AS attemptCount FROM bbva.PersonCertificationAttempt a WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle) attemptStats
          OUTER APPLY (SELECT TOP 1 a.Result FROM bbva.PersonCertificationAttempt a WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle ORDER BY a.AttemptNumber DESC,a.CreatedAt DESC,a.Id DESC) latestAttempt
          OUTER APPLY (SELECT TOP 1 r.ResolutionStatus FROM bbva.CertificationCriticalResolution r WHERE r.PersonCertificationId=pc.Id AND r.CycleNumber=pc.CurrentCycle ORDER BY r.UpdatedAt DESC,r.Id DESC) resolution
          WHERE pc.Id=@recordId;
        `);
      const row = state.recordset[0] as any;
      if (!row) {
        await transaction.rollback();
        return null;
      }
      const criticalOpen = String(row.baseStatus) === 'FAILED'
        && Boolean(row.requiresAttempts)
        && isCriticalTwoAttemptExhausted({
          certificationType: String(row.certificationType ?? ''),
          maxAttempts: row.maxAttempts === null || row.maxAttempts === undefined ? null : Number(row.maxAttempts),
          attemptCount: Number(row.attemptCount ?? 0),
          latestAttemptResult: String(row.latestAttemptResult ?? ''),
        })
        && ['PENDING_REVIEW', 'LOW_REQUESTED'].includes(String(row.resolutionStatus ?? 'PENDING_REVIEW'));
      if (criticalOpen) {
        throw Object.assign(new Error('La certificación tiene un caso crítico 2/2 pendiente. Resuelve baja o becario antes de quitarla del seguimiento.'), { statusCode: 409, code: 'CRITICAL_RESOLUTION_REQUIRED' });
      }
      if (!Boolean(row.applicable) || String(row.baseStatus) === 'NOT_APPLICABLE') {
        await transaction.commit();
        return (await this.detail(collaboratorId, recordId))?.item ?? null;
      }
      await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.PersonCertification
          SET Applicable=0,BaseStatus=N'NOT_APPLICABLE',Source=N'MANUAL',LastDataSource=N'MANUAL',UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
          WHERE Id=@recordId AND Applicable=1 AND BaseStatus<>N'NOT_APPLICABLE';
          INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail)
          VALUES(@recordId,N'NOT_APPLICABLE',N'La certificación fue quitada del seguimiento.',@actorEmail);
        `);
      await transaction.commit();
      return (await this.detail(collaboratorId, recordId))?.item ?? null;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async tracking(): Promise<CertificationTrackingRecord[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT
        CAST(c.Id AS NVARCHAR(36)) AS collaboratorId,
        CAST(p.Id AS NVARCHAR(36)) AS personId,
        LTRIM(RTRIM(CONCAT(p.FirstName,N' ',ISNULL(p.LastName,N'')))) AS collaboratorName,
        p.Profile AS profile,
        p.CurrentTechnology AS technology,
        p.BbvaStructureLevel2 AS bbvaStructureLevel2,
        p.BbvaStructureLevel3 AS bbvaStructureLevel3,
        CONVERT(VARCHAR(10),c.StartDate,23) AS bbvaStartDate,
        CAST(pc.Id AS NVARCHAR(36)) AS certificationRecordId,
        CAST(cc.Id AS NVARCHAR(36)) AS certificationId,
        cc.Name AS certificationName,
        cc.CertificationType AS certificationType,
        tech.Name AS technologyName,
        cc.InitialCompletionDays AS initialCompletionDays,
        CONVERT(VARCHAR(10),pc.InitialDueDate,23) AS initialDueDate,
        pc.BaseStatus AS baseStatus,
        ${STATUS_CASE} AS status,
        pc.CurrentCycle AS currentCycle,
        ISNULL(attemptStats.attemptCount,0) AS attemptCount,
        ISNULL(attemptStats.attemptCount,0) + 1 AS nextAttemptNumber,
        CONVERT(VARCHAR(10),pc.NextScheduledDate,23) AS scheduledDate,
        CONVERT(VARCHAR(10),pc.ApplicationDate,23) AS lastApplicationDate,
        CONVERT(VARCHAR(10),effectiveDates.EffectiveApprovedDate,23) AS approvedDate,
        CONVERT(VARCHAR(10),effectiveDates.EffectiveExpirationDate,23) AS expirationDate,
        cc.RecertificationEnabled AS recertificationEnabled,
        cc.RequiresAttempts AS requiresAttempts,
        cc.MaxAttempts AS maxAttempts,
        CAST(latestAttempt.Id AS NVARCHAR(36)) AS latestAttemptId,
        latestAttempt.Result AS latestAttemptResult,
        cc.TracksScore AS tracksScore,
        criticalResolution.ResolutionStatus AS criticalResolutionStatus,
        criticalResolution.Notes AS criticalResolutionNotes,
        CONVERT(VARCHAR(33),criticalResolution.UpdatedAt,127) AS criticalResolutionAt,
        CASE WHEN pc.BaseStatus=N'FAILED' AND cc.RequiresAttempts=1 AND cc.MaxAttempts=2 AND cc.CertificationType IN (N'DEVELOPMENT_SECURITY',N'TECHNOLOGICAL',N'NORMATIVE_TESTING') AND latestAttempt.Result=N'FAILED' AND ISNULL(attemptStats.attemptCount,0) >= 2 AND ISNULL(criticalResolution.ResolutionStatus,N'PENDING_REVIEW')=N'PENDING_REVIEW' THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS criticalActionRequired
      FROM bbva.PersonCertification pc
      INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
      INNER JOIN bbva.Person p ON p.Id=pc.PersonId
      INNER JOIN bbva.Collaborator c ON c.PersonId=p.Id AND c.Status=N'ACTIVE'
      LEFT JOIN bbva.CatalogTechnology tech ON tech.Id=cc.TechnologyId
      OUTER APPLY (
        SELECT TOP 1 r.ResolutionStatus,r.Notes,r.UpdatedAt
        FROM bbva.CertificationCriticalResolution r
        WHERE r.PersonCertificationId=pc.Id AND r.CycleNumber=pc.CurrentCycle
        ORDER BY r.UpdatedAt DESC,r.Id DESC
      ) criticalResolution
      OUTER APPLY (
        SELECT COUNT(1) AS attemptCount
        FROM bbva.PersonCertificationAttempt a
        WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle
      ) attemptStats
      OUTER APPLY (
        SELECT TOP 1 a.Id,a.Result
        FROM bbva.PersonCertificationAttempt a
        WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle
        ORDER BY a.AttemptNumber DESC,a.CreatedAt DESC,a.Id DESC
      ) latestAttempt
      OUTER APPLY (
        SELECT MAX(a.ApplicationDate) AS LatestApprovedAttemptDate
        FROM bbva.PersonCertificationAttempt a
        WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle AND a.Result=N'APPROVED'
      ) latestApproval
      CROSS APPLY (
        SELECT
          CASE WHEN latestApproval.LatestApprovedAttemptDate IS NOT NULL AND (pc.ApprovedDate IS NULL OR latestApproval.LatestApprovedAttemptDate > pc.ApprovedDate) THEN latestApproval.LatestApprovedAttemptDate ELSE pc.ApprovedDate END AS EffectiveApprovedDate,
          CASE WHEN pc.BaseStatus=N'APPROVED' AND cc.ValidityMonths IS NOT NULL AND (CASE WHEN latestApproval.LatestApprovedAttemptDate IS NOT NULL AND (pc.ApprovedDate IS NULL OR latestApproval.LatestApprovedAttemptDate > pc.ApprovedDate) THEN latestApproval.LatestApprovedAttemptDate ELSE pc.ApprovedDate END) IS NOT NULL
            THEN DATEADD(month,cc.ValidityMonths,(CASE WHEN latestApproval.LatestApprovedAttemptDate IS NOT NULL AND (pc.ApprovedDate IS NULL OR latestApproval.LatestApprovedAttemptDate > pc.ApprovedDate) THEN latestApproval.LatestApprovedAttemptDate ELSE pc.ApprovedDate END)) ELSE pc.ExpirationDate END AS EffectiveExpirationDate
      ) effectiveDates
      WHERE pc.Applicable=1 AND pc.BaseStatus<>N'NOT_APPLICABLE' AND cc.Status=N'ACTIVE'
      ORDER BY CASE WHEN pc.BaseStatus=N'FAILED' AND cc.RequiresAttempts=1 AND cc.MaxAttempts=2 AND cc.CertificationType IN (N'DEVELOPMENT_SECURITY',N'TECHNOLOGICAL',N'NORMATIVE_TESTING') AND latestAttempt.Result=N'FAILED' AND ISNULL(attemptStats.attemptCount,0) >= 2 AND ISNULL(criticalResolution.ResolutionStatus,N'PENDING_REVIEW')=N'PENDING_REVIEW' THEN 0 ELSE 1 END,
               CASE ${STATUS_CASE} WHEN N'EXPIRED' THEN 1 WHEN N'RECERTIFICATION_PENDING' THEN 1 WHEN N'EXPIRING' THEN 2 WHEN N'FAILED' THEN 3 WHEN N'SCHEDULED' THEN 4 WHEN N'PENDING' THEN 5 ELSE 6 END,
               effectiveDates.EffectiveExpirationDate ASC,pc.NextScheduledDate ASC,p.FirstName ASC,cc.Name ASC;
    `);
    const rows = result.recordset.map((row: any) => {
      const currentCycle=Number(row.currentCycle);
      const attemptCount=Number(row.attemptCount);
      const initialCompletionDays=row.initialCompletionDays===null?null:Number(row.initialCompletionDays);
      const schedule=deriveInitialCertificationSchedule({
        bbvaStartDate:row.bbvaStartDate??null,
        initialCompletionDays,
        initialDueDate:row.initialDueDate??null,
        currentCycle,
        baseStatus:String(row.baseStatus??''),
        applicable:true,
        requiresAttempts:Boolean(row.requiresAttempts),
        attemptCount,
        latestAttemptResult:row.latestAttemptResult??null,
      },bbvaBusinessDate());
      return {
        ...row,
        currentCycle,
        attemptCount,
        nextAttemptNumber: Number(row.nextAttemptNumber),
        initialCompletionDays,
        firstAttemptDueDate:schedule.firstAttemptDueDate,
        initialDueDate:schedule.completionDueDate,
        initialSchedulePhase:schedule.phase,
        initialScheduleDueDate:schedule.dueDate,
        daysToInitialSchedule:schedule.daysRemaining,
        initialScheduleTiming:schedule.timing,
        maxAttempts: row.maxAttempts === null ? null : Number(row.maxAttempts),
        recertificationEnabled: Boolean(row.recertificationEnabled),
        requiresAttempts: Boolean(row.requiresAttempts),
        tracksScore: Boolean(row.tracksScore),
        criticalActionRequired: Boolean(row.criticalActionRequired),
      };
    }) as CertificationTrackingRecord[];
    return rows;
  }

  async listImportCatalog(): Promise<ImportCertificationCatalogConfig[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT CAST(cc.Id AS NVARCHAR(36)) AS id,cc.Name AS name,cc.CertificationType AS certificationType,
             t.Name AS technologyName,cc.ValidityMonths AS validityMonths,
             cc.InitialCompletionDays AS initialCompletionDays,cc.ExpiringSoonDays AS expiringSoonDays,
             cc.RecertificationEnabled AS recertificationEnabled,cc.RequiresAttempts AS requiresAttempts,cc.MaxAttempts AS maxAttempts,
             cc.RequiresApplicationDate AS requiresApplicationDate,cc.Status AS status
      FROM bbva.CertificationCatalog cc
      LEFT JOIN bbva.CatalogTechnology t ON t.Id=cc.TechnologyId
      ORDER BY CASE cc.Status WHEN N'ACTIVE' THEN 0 ELSE 1 END,cc.CertificationType,cc.Name;
    `);
    return result.recordset.map((row: any) => ({
      ...row,
      validityMonths: row.validityMonths === null ? null : Number(row.validityMonths),
      initialCompletionDays: row.initialCompletionDays === null ? null : Number(row.initialCompletionDays),
      expiringSoonDays: row.expiringSoonDays === null ? null : Number(row.expiringSoonDays),
      recertificationEnabled: Boolean(row.recertificationEnabled),
      requiresAttempts: Boolean(row.requiresAttempts),
      maxAttempts: row.maxAttempts === null ? null : Number(row.maxAttempts),
      requiresApplicationDate: Boolean(row.requiresApplicationDate),
      status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    })) as ImportCertificationCatalogConfig[];
  }

  async listImportStates(): Promise<Map<string, ImportCertificationCurrentState[]>> {
    const pool = await getDbConnection();
    const records = await pool.request().query(`
      SELECT CAST(pc.Id AS NVARCHAR(36)) AS recordId,CAST(pc.PersonId AS NVARCHAR(36)) AS personId,
             CAST(pc.CertificationId AS NVARCHAR(36)) AS certificationId,cc.Name AS certificationName,
             cc.CertificationType AS certificationType,t.Name AS technologyName,pc.Source AS source,
             pc.Applicable AS applicable,pc.BaseStatus AS baseStatus,${STATUS_CASE} AS calculatedStatus,
             pc.CurrentCycle AS currentCycle,CONVERT(VARCHAR(10),pc.ApplicationDate,23) AS applicationDate,
             CONVERT(VARCHAR(10),effectiveDates.EffectiveApprovedDate,23) AS approvedDate,CONVERT(VARCHAR(10),effectiveDates.EffectiveExpirationDate,23) AS expirationDate,
             CONVERT(VARCHAR(10),pc.InitialDueDate,23) AS initialDueDate,
             pc.ImportedCertificationStatus AS importedCertificationStatus,pc.ImportedExamStatus AS importedExamStatus,
             pc.LastScore10 AS lastScore10,pc.ImportedAttemptNumber AS importedAttemptNumber,
             pc.LastDataSource AS lastDataSource,pc.LastImportFingerprint AS lastImportFingerprint,pc.SofttekManagement AS softtekManagement
      FROM bbva.PersonCertification pc
      INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
      LEFT JOIN bbva.CatalogTechnology t ON t.Id=cc.TechnologyId
      OUTER APPLY (
        SELECT MAX(a.ApplicationDate) AS LatestApprovedAttemptDate
        FROM bbva.PersonCertificationAttempt a
        WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle AND a.Result=N'APPROVED'
      ) latestApproval
      CROSS APPLY (
        SELECT
          CASE
            WHEN latestApproval.LatestApprovedAttemptDate IS NOT NULL
              AND (pc.ApprovedDate IS NULL OR latestApproval.LatestApprovedAttemptDate > pc.ApprovedDate)
              THEN latestApproval.LatestApprovedAttemptDate
            ELSE pc.ApprovedDate
          END AS EffectiveApprovedDate,
          CASE
            WHEN pc.BaseStatus=N'APPROVED'
              AND cc.ValidityMonths IS NOT NULL
              AND (CASE WHEN latestApproval.LatestApprovedAttemptDate IS NOT NULL AND (pc.ApprovedDate IS NULL OR latestApproval.LatestApprovedAttemptDate > pc.ApprovedDate) THEN latestApproval.LatestApprovedAttemptDate ELSE pc.ApprovedDate END) IS NOT NULL
              THEN DATEADD(month,cc.ValidityMonths,(CASE WHEN latestApproval.LatestApprovedAttemptDate IS NOT NULL AND (pc.ApprovedDate IS NULL OR latestApproval.LatestApprovedAttemptDate > pc.ApprovedDate) THEN latestApproval.LatestApprovedAttemptDate ELSE pc.ApprovedDate END))
            ELSE pc.ExpirationDate
          END AS EffectiveExpirationDate
      ) effectiveDates;
    `);
    const attempts = await pool.request().query(`
      SELECT CAST(a.Id AS NVARCHAR(36)) AS id,CAST(a.PersonCertificationId AS NVARCHAR(36)) AS recordId,
             a.CycleNumber AS cycleNumber,a.AttemptNumber AS attemptNumber,
             CONVERT(VARCHAR(10),a.ApplicationDate,23) AS applicationDate,a.Result AS result,
             a.Score10 AS score10,a.Source AS source,a.ImportFingerprint AS importFingerprint
      FROM bbva.PersonCertificationAttempt a;
    `);
    const attemptsByRecord = new Map<string, ImportCertificationCurrentState['attempts']>();
    for (const row of attempts.recordset as any[]) {
      const list = attemptsByRecord.get(String(row.recordId)) ?? [];
      list.push({
        id: String(row.id), cycleNumber:Number(row.cycleNumber), attemptNumber:Number(row.attemptNumber),
        applicationDate:row.applicationDate ?? null, result:String(row.result),
        score10:row.score10 === null ? null : Number(row.score10), source:row.source ?? null, importFingerprint:row.importFingerprint ?? null,
      });
      attemptsByRecord.set(String(row.recordId), list);
    }
    const byPerson = new Map<string, ImportCertificationCurrentState[]>();
    for (const row of records.recordset as any[]) {
      const state: ImportCertificationCurrentState = {
        recordId:String(row.recordId), certificationId:String(row.certificationId), certificationName:String(row.certificationName),
        certificationType:String(row.certificationType), technologyName:row.technologyName ?? null, source:row.source,
        applicable:Boolean(row.applicable), baseStatus:String(row.baseStatus), calculatedStatus:String(row.calculatedStatus),
        currentCycle:Number(row.currentCycle), applicationDate:row.applicationDate ?? null, approvedDate:row.approvedDate ?? null,
        expirationDate:row.expirationDate ?? null, initialDueDate:row.initialDueDate ?? null,
        importedCertificationStatus:row.importedCertificationStatus ?? null, importedExamStatus:row.importedExamStatus ?? null,
        lastScore10:row.lastScore10 === null ? null : Number(row.lastScore10),
        importedAttemptNumber:row.importedAttemptNumber === null ? null : Number(row.importedAttemptNumber),
        lastDataSource:row.lastDataSource ?? null, lastImportFingerprint:row.lastImportFingerprint ?? null, softtekManagement:row.softtekManagement ?? null,
        hasManualResult:(attemptsByRecord.get(String(row.recordId)) ?? []).some((attempt) => (attempt.source ?? 'MANUAL').toUpperCase() !== 'IMPORT'),
        attempts:attemptsByRecord.get(String(row.recordId)) ?? [],
      };
      byPerson.set(String(row.personId), [...(byPerson.get(String(row.personId)) ?? []), state]);
    }
    return byPerson;
  }

  async applyImportedEvidence(args: {
    personId: string;
    config: ImportCertificationCatalogConfig;
    block: ImportCertificationBlock;
    evidence: ParsedCertificationEvidence;
    actorEmail: string;
  }): Promise<{ changed: boolean; resultRegistered: boolean }> {
    const { personId, config, block, evidence, actorEmail } = args;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const currentResult = await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('certificationId', sql.UniqueIdentifier, config.id)
        .query(`SELECT TOP 1 CAST(Id AS NVARCHAR(36)) AS id,CurrentCycle,Source,BaseStatus,LastImportFingerprint
                FROM bbva.PersonCertification WHERE PersonId=@personId AND CertificationId=@certificationId;`);
      let recordId = currentResult.recordset[0]?.id ? String(currentResult.recordset[0].id) : '';
      const currentCycle = Number(currentResult.recordset[0]?.CurrentCycle ?? 1);
      if (!recordId) {
        recordId = crypto.randomUUID();
        await new sql.Request(transaction)
          .input('id',sql.UniqueIdentifier,recordId).input('personId',sql.UniqueIdentifier,personId)
          .input('certificationId',sql.UniqueIdentifier,config.id).input('actorEmail',sql.NVarChar(255),actorEmail)
          .query(`INSERT INTO bbva.PersonCertification(Id,PersonId,CertificationId,Applicable,Mandatory,Source,CurrentCycle,BaseStatus,CreatedByEmail,UpdatedByEmail)
                  VALUES(@id,@personId,@certificationId,1,0,N'AUTO',1,N'PENDING',@actorEmail,@actorEmail);`);
      }

      const before = await new sql.Request(transaction).input('id',sql.UniqueIdentifier,recordId).query(`
        SELECT Applicable,BaseStatus,CONVERT(VARCHAR(10),ApplicationDate,23) AS ApplicationDate,
               CONVERT(VARCHAR(10),ApprovedDate,23) AS ApprovedDate,CONVERT(VARCHAR(10),ExpirationDate,23) AS ExpirationDate,
               CONVERT(VARCHAR(10),InitialDueDate,23) AS InitialDueDate,ImportedCertificationStatus,ImportedExamStatus,
               LastScore10,ImportedAttemptNumber,LastImportFingerprint,SofttekManagement
        FROM bbva.PersonCertification WHERE Id=@id;
      `);
      const previous = before.recordset[0] as any;
      const targetApplicable = evidence.applicable !== false;
      const targetApplicationDate = targetApplicable ? evidence.applicationDate : null;
      const targetApprovedDate = targetApplicable ? evidence.approvedDate : null;
      const targetExpirationDate = targetApplicable ? evidence.expirationDate : null;
      const targetBaseStatus = evidence.baseStatus ?? (targetApplicable ? 'PENDING' : 'NOT_APPLICABLE');
      const sameFingerprint = String(previous?.LastImportFingerprint ?? '') === evidence.fingerprint;
      const sameEffective = Boolean(previous) && sameEffectiveImportCertificationState({
        applicable:Boolean(previous.Applicable),
        baseStatus:String(previous.BaseStatus ?? ''),
        applicationDate:previous.ApplicationDate ?? null,
        approvedDate:previous.ApprovedDate ?? null,
        expirationDate:previous.ExpirationDate ?? null,
        initialDueDate:previous.InitialDueDate ?? null,
        lastScore10:previous.LastScore10 === null ? null : Number(previous.LastScore10),
        importedAttemptNumber:previous.ImportedAttemptNumber === null ? null : Number(previous.ImportedAttemptNumber),
      }, evidence);

      const hasFormalResultEvidence = Boolean(evidence.rawExamStatus) || config.requiresAttempts || config.requiresApplicationDate;
      let resultRegistered = false;
      let pendingAttempt: { attemptNumber: number; applicationDate: string; result: 'APPROVED' | 'FAILED'; score10: number | null; fingerprint: string } | null = null;

      if (hasFormalResultEvidence && config.requiresAttempts && evidence.administrativeAttempt !== null && evidence.administrativeAttempt > 0 && evidence.applicationDate && evidence.baseStatus && ['APPROVED','FAILED'].includes(evidence.baseStatus)) {
        const result = evidence.baseStatus === 'APPROVED' ? 'APPROVED' : 'FAILED';
        const attemptNumber = Math.max(1, evidence.administrativeAttempt);
        const attemptFingerprint = importCertificationAttemptFingerprint({ block, applicationDate:evidence.applicationDate, result, score10:evidence.score10, administrativeAttempt:evidence.administrativeAttempt });
        const existingAttempt = await new sql.Request(transaction)
          .input('recordId',sql.UniqueIdentifier,recordId).input('fingerprint',sql.Char(64),attemptFingerprint)
          .query(`SELECT TOP 1 1 AS ok FROM bbva.PersonCertificationAttempt WHERE PersonCertificationId=@recordId AND ImportFingerprint=@fingerprint;`);
        if (!existingAttempt.recordset[0]?.ok) {
          const slot = await new sql.Request(transaction)
            .input('recordId',sql.UniqueIdentifier,recordId).input('cycle',sql.Int,currentCycle).input('attemptNumber',sql.Int,attemptNumber)
            .query(`SELECT TOP 1 Source,CONVERT(VARCHAR(10),ApplicationDate,23) AS ApplicationDate,Result,Score10
                    FROM bbva.PersonCertificationAttempt WHERE PersonCertificationId=@recordId AND CycleNumber=@cycle AND AttemptNumber=@attemptNumber;`);
          const occupied = slot.recordset[0] as any;
          if (occupied) {
            const occupiedScore = occupied.Score10 === null ? null : Number(occupied.Score10);
            const sameSlot = sameImportCertificationAttemptEvidence(
              { applicationDate: occupied.ApplicationDate ?? null, result: String(occupied.Result ?? ''), score10: occupiedScore },
              { applicationDate: evidence.applicationDate, result, score10: evidence.score10 },
            );
            if (!sameSlot) {
              throw Object.assign(
                new Error(`El intento ${attemptNumber} de ${config.name} ya existe con fecha, resultado o promedio diferentes. Vuelve a validar antes de aplicar.`),
                { statusCode: 409, code: 'CERTIFICATION_ATTEMPT_SLOT_CONFLICT' },
              );
            }
          } else {
            pendingAttempt = { attemptNumber, applicationDate:evidence.applicationDate, result, score10:evidence.score10, fingerprint:attemptFingerprint };
          }
        }
      }

      if (!sameEffective || !sameFingerprint) {
        await new sql.Request(transaction)
          .input('id',sql.UniqueIdentifier,recordId).input('applicable',sql.Bit,targetApplicable)
          .input('baseStatus',sql.NVarChar(24),targetBaseStatus).input('applicationDate',sql.Date,targetApplicationDate)
          .input('approvedDate',sql.Date,targetApprovedDate).input('expirationDate',sql.Date,targetExpirationDate)
          .input('initialDueDate',sql.Date,evidence.initialDueDate)
          .input('importedCertificationStatus',sql.NVarChar(80),evidence.rawCertificationStatus)
          .input('importedExamStatus',sql.NVarChar(60),evidence.rawExamStatus)
          .input('lastScore10',sql.Decimal(5,2),evidence.score10)
          .input('importedAttemptNumber',sql.Int,evidence.administrativeAttempt)
          .input('fingerprint',sql.Char(64),evidence.fingerprint).input('softtekManagement',sql.NVarChar(1500),evidence.softtekManagement).input('actorEmail',sql.NVarChar(255),actorEmail)
          .query(`UPDATE bbva.PersonCertification SET Applicable=@applicable,BaseStatus=@baseStatus,
                    ApplicationDate=@applicationDate,ApprovedDate=CASE WHEN @baseStatus=N'APPROVED' THEN @approvedDate ELSE ApprovedDate END,
                    ExpirationDate=CASE WHEN @baseStatus=N'APPROVED' THEN @expirationDate WHEN @baseStatus=N'NOT_APPLICABLE' THEN NULL ELSE ExpirationDate END,
                    InitialDueDate=@initialDueDate,ImportedCertificationStatus=@importedCertificationStatus,
                    ImportedExamStatus=@importedExamStatus,LastScore10=@lastScore10,ImportedAttemptNumber=@importedAttemptNumber,
                    SofttekManagement=COALESCE(@softtekManagement,SofttekManagement),LastDataSource=N'IMPORT',LastImportFingerprint=@fingerprint,LastImportedAt=SYSUTCDATETIME(),
                    UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@id;`);
      }

      if (pendingAttempt) {
        await new sql.Request(transaction)
          .input('recordId',sql.UniqueIdentifier,recordId).input('cycle',sql.Int,currentCycle).input('attemptNumber',sql.Int,pendingAttempt.attemptNumber)
          .input('applicationDate',sql.Date,pendingAttempt.applicationDate).input('result',sql.NVarChar(16),pendingAttempt.result)
          .input('score10',sql.Decimal(5,2),pendingAttempt.score10).input('fingerprint',sql.Char(64),pendingAttempt.fingerprint)
          .input('actorEmail',sql.NVarChar(255),actorEmail)
          .query(`INSERT INTO bbva.PersonCertificationAttempt(PersonCertificationId,CycleNumber,AttemptNumber,ApplicationDate,Result,Score10,Source,ImportFingerprint,CreatedByEmail)
                  VALUES(@recordId,@cycle,@attemptNumber,@applicationDate,@result,@score10,N'IMPORT',@fingerprint,@actorEmail);`);
        resultRegistered = true;
      }

      if ((!sameEffective || !sameFingerprint) || resultRegistered) {
        const description = `Importación Excel: ${config.name} (${evidence.lifecycle ?? 'sin ciclo'}), estado=${evidence.rawCertificationStatus ?? 'vacío'}, examen=${evidence.rawExamStatus ?? 'vacío'}, fecha=${evidence.applicationDate ?? 'vacía'}, intento=${evidence.administrativeAttempt ?? 'vacío'}.`;
        await new sql.Request(transaction)
          .input('recordId',sql.UniqueIdentifier,recordId).input('description',sql.NVarChar(600),description.slice(0,600))
          .input('actorEmail',sql.NVarChar(255),actorEmail)
          .query(`INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,Source,CreatedByEmail)
                  VALUES(@recordId,N'IMPORTED_RECONCILIATION',@description,N'IMPORT',@actorEmail);`);
      }

      await transaction.commit();
      return { changed: !sameEffective || !sameFingerprint, resultRegistered };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

}
