import sql from 'mssql';
import { getDbConnection } from './db.js';
import type {
  CertificationAttemptInput,
  CertificationHistoryRecord,
  CertificationUpdateInput,
  CollaboratorCertificationAttemptRecord,
  CollaboratorCertificationDetail,
  CollaboratorCertificationListResult,
  CollaboratorCertificationRecord,
  CollaboratorCertificationSummary,
} from './bbvaCollaboratorCertificationDomain.js';

const STATUS_CASE = `
  CASE
    WHEN pc.Applicable=0 OR pc.BaseStatus=N'NOT_APPLICABLE' THEN N'NOT_APPLICABLE'
    WHEN pc.BaseStatus=N'APPROVED' AND pc.ExpirationDate IS NOT NULL AND pc.ExpirationDate < CONVERT(date,SYSUTCDATETIME()) AND cc.RecertificationEnabled=1 THEN N'RECERTIFICATION_PENDING'
    WHEN pc.BaseStatus=N'APPROVED' AND pc.ExpirationDate IS NOT NULL AND pc.ExpirationDate < CONVERT(date,SYSUTCDATETIME()) THEN N'EXPIRED'
    WHEN pc.BaseStatus=N'APPROVED' AND pc.ExpirationDate IS NOT NULL AND pc.ExpirationDate <= DATEADD(day,ISNULL(cc.ExpiringSoonDays,90),CONVERT(date,SYSUTCDATETIME())) THEN N'EXPIRING'
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
    pc.Mandatory AS mandatory,
    pc.Applicable AS applicable,
    pc.Source AS source,
    pc.CurrentCycle AS currentCycle,
    pc.BaseStatus AS baseStatus,
    ${STATUS_CASE} AS status,
    (SELECT COUNT(1) FROM bbva.PersonCertificationAttempt a WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle) AS attemptCount,
    CONVERT(VARCHAR(10),pc.ApplicationDate,23) AS applicationDate,
    CONVERT(VARCHAR(10),pc.ApprovedDate,23) AS approvedDate,
    CONVERT(VARCHAR(10),pc.ExpirationDate,23) AS expirationDate,
    cc.ValidityMonths AS validityMonths,
    cc.ExpiringSoonDays AS expiringSoonDays,
    cc.RecertificationEnabled AS recertificationEnabled,
    cc.RequiresAttempts AS requiresAttempts,
    cc.RequiresApplicationDate AS requiresApplicationDate,
    pc.Notes AS notes,
    CONVERT(VARCHAR(33),pc.CreatedAt,127) AS createdAt,
    CONVERT(VARCHAR(33),pc.UpdatedAt,127) AS updatedAt
  FROM bbva.PersonCertification pc
  INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
  LEFT JOIN bbva.CatalogTechnology t ON t.Id=cc.TechnologyId
  INNER JOIN bbva.Collaborator c ON c.PersonId=pc.PersonId
`;

function toRecord(row: any): CollaboratorCertificationRecord {
  return {
    ...row,
    mandatory: Boolean(row.mandatory),
    applicable: Boolean(row.applicable),
    currentCycle: Number(row.currentCycle),
    attemptCount: Number(row.attemptCount),
    validityMonths: row.validityMonths === null ? null : Number(row.validityMonths),
    expiringSoonDays: row.expiringSoonDays === null ? null : Number(row.expiringSoonDays),
    recertificationEnabled: Boolean(row.recertificationEnabled),
    requiresAttempts: Boolean(row.requiresAttempts),
    requiresApplicationDate: Boolean(row.requiresApplicationDate),
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
               UPPER(ISNULL(cp.Seniority,p.Expertise)) AS seniority
        FROM bbva.Collaborator c
        INNER JOIN bbva.Person p ON p.Id=c.PersonId
        LEFT JOIN bbva.CatalogProfile cp ON cp.Id=p.ProfileCatalogId
        WHERE c.Id=@id;
      `);
      const row = current.recordset[0] as { collaboratorStatus?: string; personId?: string; technologyId?: string | null; seniority?: string | null } | undefined;
      if (!row?.personId) {
        await transaction.rollback();
        return false;
      }

      await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, row.personId)
        .input('technologyId', sql.UniqueIdentifier, row.technologyId || null)
        .input('seniority', sql.NVarChar(16), row.seniority || null)
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
            PersonId,CertificationId,Applicable,Mandatory,Source,CurrentCycle,BaseStatus,CreatedByEmail,UpdatedByEmail
          )
          SELECT @personId,a.CertificationId,1,a.Mandatory,N'AUTO',1,N'PENDING',@actorEmail,@actorEmail
          FROM @Applicable a
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
              UpdatedAt=SYSUTCDATETIME(),
              UpdatedByEmail=@actorEmail
          FROM bbva.PersonCertification pc
          INNER JOIN @Applicable a ON a.CertificationId=pc.CertificationId
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
             a.Result AS result,CONVERT(VARCHAR(10),a.ResultDate,23) AS resultDate,
             a.CostAmount AS costAmount,a.CostCurrency AS costCurrency,a.Notes AS notes,
             CONVERT(VARCHAR(33),a.CreatedAt,127) AS createdAt,a.CreatedByEmail AS createdByEmail
      FROM bbva.PersonCertificationAttempt a
      WHERE a.PersonCertificationId=@recordId
      ORDER BY a.CycleNumber DESC,a.AttemptNumber DESC;
    `);
    const history = await pool.request().input('recordId', sql.UniqueIdentifier, recordId).query(`
      SELECT CAST(h.Id AS NVARCHAR(36)) AS id,
             CAST(h.PersonCertificationId AS NVARCHAR(36)) AS certificationRecordId,
             h.EventType AS eventType,h.Description AS description,
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
        costAmount: row.costAmount === null ? null : Number(row.costAmount),
      })) as CollaboratorCertificationAttemptRecord[],
      history: history.recordset as CertificationHistoryRecord[],
    };
  }

  async addManual(collaboratorId: string, certificationId: string, actorEmail: string): Promise<CollaboratorCertificationRecord | null> {
    const personId = await this.collaboratorPersonId(collaboratorId);
    if (!personId) return null;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const catalog = await new sql.Request(transaction).input('certificationId', sql.UniqueIdentifier, certificationId).query(`
        SELECT DefaultMandatory AS mandatory,Status AS status FROM bbva.CertificationCatalog WHERE Id=@certificationId;
      `);
      if (!catalog.recordset[0]) throw Object.assign(new Error('La certificación no existe.'), { statusCode: 404 });
      if (String(catalog.recordset[0].status) !== 'ACTIVE') throw Object.assign(new Error('La certificación está inactiva.'), { statusCode: 409 });

      const existing = await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('certificationId', sql.UniqueIdentifier, certificationId)
        .query(`SELECT CAST(Id AS NVARCHAR(36)) AS id FROM bbva.PersonCertification WHERE PersonId=@personId AND CertificationId=@certificationId;`);

      let recordId: string;
      if (existing.recordset[0]?.id) {
        recordId = String(existing.recordset[0].id);
        await new sql.Request(transaction)
          .input('id', sql.UniqueIdentifier, recordId)
          .input('mandatory', sql.Bit, Boolean(catalog.recordset[0].mandatory))
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`UPDATE bbva.PersonCertification SET Applicable=1,Mandatory=@mandatory,Source=N'MANUAL',BaseStatus=CASE WHEN BaseStatus=N'NOT_APPLICABLE' THEN N'PENDING' ELSE BaseStatus END,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@id;`);
      } else {
        const created = await new sql.Request(transaction)
          .input('personId', sql.UniqueIdentifier, personId)
          .input('certificationId', sql.UniqueIdentifier, certificationId)
          .input('mandatory', sql.Bit, Boolean(catalog.recordset[0].mandatory))
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`INSERT INTO bbva.PersonCertification(PersonId,CertificationId,Applicable,Mandatory,Source,CurrentCycle,BaseStatus,CreatedByEmail,UpdatedByEmail)
                  OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id
                  VALUES(@personId,@certificationId,1,@mandatory,N'MANUAL',1,N'PENDING',@actorEmail,@actorEmail);`);
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
    await pool.request()
      .input('recordId', sql.UniqueIdentifier, recordId)
      .input('applicationDate', sql.Date, input.applicationDate)
      .input('notes', sql.NVarChar(1500), input.notes)
      .input('mandatory', sql.Bit, input.mandatory)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`
        UPDATE bbva.PersonCertification
        SET ApplicationDate=@applicationDate,Notes=@notes,Mandatory=@mandatory,
            BaseStatus=CASE
              WHEN BaseStatus=N'PENDING' AND @applicationDate IS NOT NULL THEN N'SCHEDULED'
              WHEN BaseStatus=N'SCHEDULED' AND @applicationDate IS NULL THEN N'PENDING'
              ELSE BaseStatus
            END,
            UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
        WHERE Id=@recordId;
        INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail)
        VALUES(@recordId,N'UPDATED',N'La configuración de seguimiento de la certificación fue actualizada.',@actorEmail);
      `);
    return (await this.detail(collaboratorId, recordId))?.item ?? null;
  }

  async addAttempt(collaboratorId: string, recordId: string, input: CertificationAttemptInput, actorEmail: string): Promise<CollaboratorCertificationDetail | null> {
    const current = await this.detail(collaboratorId, recordId);
    if (!current) return null;
    if (!current.item.applicable) throw Object.assign(new Error('La certificación no está marcada como aplicable.'), { statusCode: 409 });

    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const catalog = await new sql.Request(transaction).input('certificationId', sql.UniqueIdentifier, current.item.certificationId).query(`
        SELECT ValidityMonths,FirstAttemptCost,SubsequentAttemptCost,CostCurrency,RequiresApplicationDate
        FROM bbva.CertificationCatalog WHERE Id=@certificationId;
      `);
      const config = catalog.recordset[0] as any;
      if (config?.RequiresApplicationDate && !input.applicationDate) {
        throw Object.assign(new Error('La fecha de aplicación es obligatoria para esta certificación.'), { statusCode: 400 });
      }

      const count = await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('cycle', sql.Int, current.item.currentCycle)
        .query(`SELECT COUNT(1) AS total FROM bbva.PersonCertificationAttempt WHERE PersonCertificationId=@recordId AND CycleNumber=@cycle;`);
      const attemptNumber = Number(count.recordset[0]?.total ?? 0) + 1;
      const costAmount = attemptNumber === 1 ? config?.FirstAttemptCost ?? null : config?.SubsequentAttemptCost ?? null;
      const resultDate = input.result === 'PENDING' ? null : (input.resultDate || input.applicationDate || new Date().toISOString().slice(0, 10));
      const approvedDate = input.result === 'APPROVED' ? resultDate : null;

      await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('cycle', sql.Int, current.item.currentCycle)
        .input('attemptNumber', sql.Int, attemptNumber)
        .input('applicationDate', sql.Date, input.applicationDate)
        .input('result', sql.NVarChar(16), input.result)
        .input('resultDate', sql.Date, resultDate)
        .input('costAmount', sql.Decimal(12, 2), costAmount)
        .input('costCurrency', sql.NVarChar(8), config?.CostCurrency ?? null)
        .input('notes', sql.NVarChar(1000), input.notes)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO bbva.PersonCertificationAttempt(
            PersonCertificationId,CycleNumber,AttemptNumber,ApplicationDate,Result,ResultDate,CostAmount,CostCurrency,Notes,CreatedByEmail
          ) VALUES(@recordId,@cycle,@attemptNumber,@applicationDate,@result,@resultDate,@costAmount,@costCurrency,@notes,@actorEmail);
        `);

      await new sql.Request(transaction)
        .input('recordId', sql.UniqueIdentifier, recordId)
        .input('applicationDate', sql.Date, input.applicationDate)
        .input('approvedDate', sql.Date, approvedDate)
        .input('validityMonths', sql.Int, config?.ValidityMonths ?? null)
        .input('result', sql.NVarChar(16), input.result)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.PersonCertification
          SET ApplicationDate=COALESCE(@applicationDate,ApplicationDate),
              BaseStatus=CASE WHEN @result=N'APPROVED' THEN N'APPROVED' WHEN @result=N'FAILED' THEN N'FAILED' WHEN @applicationDate IS NOT NULL THEN N'APPLIED' ELSE N'SCHEDULED' END,
              ApprovedDate=CASE WHEN @result=N'APPROVED' THEN @approvedDate ELSE ApprovedDate END,
              ExpirationDate=CASE WHEN @result=N'APPROVED' AND @validityMonths IS NOT NULL THEN DATEADD(month,@validityMonths,@approvedDate)
                                  WHEN @result=N'APPROVED' THEN NULL ELSE ExpirationDate END,
              UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
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

      await transaction.commit();
      return this.detail(collaboratorId, recordId);
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
    await pool.request()
      .input('recordId', sql.UniqueIdentifier, recordId)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`
        UPDATE bbva.PersonCertification
        SET CurrentCycle=CurrentCycle+1,BaseStatus=N'PENDING',ApplicationDate=NULL,ApprovedDate=NULL,ExpirationDate=NULL,
            Applicable=1,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
        WHERE Id=@recordId;
        INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail)
        VALUES(@recordId,N'RECERTIFICATION_STARTED',N'Se inició un nuevo ciclo de recertificación.',@actorEmail);
      `);
    return (await this.detail(collaboratorId, recordId))?.item ?? null;
  }

  async markNotApplicable(collaboratorId: string, recordId: string, actorEmail: string): Promise<CollaboratorCertificationRecord | null> {
    const current = await this.detail(collaboratorId, recordId);
    if (!current) return null;
    const pool = await getDbConnection();
    await pool.request()
      .input('recordId', sql.UniqueIdentifier, recordId)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`
        UPDATE bbva.PersonCertification
        SET Applicable=0,BaseStatus=N'NOT_APPLICABLE',Source=N'MANUAL',UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
        WHERE Id=@recordId;
        INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail)
        VALUES(@recordId,N'NOT_APPLICABLE',N'La certificación fue marcada como No aplica.',@actorEmail);
      `);
    return (await this.detail(collaboratorId, recordId))?.item ?? null;
  }
}
