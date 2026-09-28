import sql from 'mssql';
import { getDbConnection } from './db.js';
import { bbvaBusinessDate } from './bbvaBusinessTime.js';
import type { TalentCvInput, TalentCvRecord, TalentHistoryRecord, TalentInput, TalentRecord, TalentStage } from './bbvaTalentDomain.js';

const TALENT_SELECT = `
  SELECT
    CAST(t.Id AS NVARCHAR(36)) AS id,
    CAST(p.Id AS NVARCHAR(36)) AS personId,
    t.TalentType AS talentType,
    ISNULL(t.AffiliationType,N'INTERNAL') AS affiliationType,
    CASE WHEN t.DeletedAt IS NULL THEN N'ACTIVE' ELSE N'DELETED' END AS recordStatus,
    CONVERT(VARCHAR(33), t.DeletedAt, 127) AS deletedAt,
    t.DeletedByEmail AS deletedByEmail,
    p.SofttekCode AS softtekCode,
    COALESCE(p.BbvaUser,p.CorporateUser) AS bbvaUser,
    COALESCE(p.SofttekEmail,p.Email) AS softtekEmail,
    p.BbvaEmail AS bbvaEmail,
    COALESCE(p.BbvaUser,p.CorporateUser) AS corporateUser,
    COALESCE(p.SofttekEmail,p.Email) AS email,
    p.FirstName AS firstName,
    p.LastName AS lastName,
    LTRIM(RTRIM(CONCAT(p.FirstName, N' ', ISNULL(p.LastName, N'')))) AS fullName,
    p.Profile AS profile,
    CAST(p.ProfileCatalogId AS NVARCHAR(36)) AS profileCatalogId,
    p.TechnologyProfile AS technologyProfile,
    CAST(p.TechnologyProfileCatalogId AS NVARCHAR(36)) AS technologyProfileCatalogId,
    p.CurrentTechnology AS currentTechnology,
    CAST(p.CurrentTechnologyCatalogId AS NVARCHAR(36)) AS currentTechnologyCatalogId,
    p.Expertise AS expertise,
    p.BbvaStructureLevel2 AS bbvaStructureLevel2,
    p.BbvaStructureLevel3 AS bbvaStructureLevel3,
    t.Stage AS stage,
    t.Active AS active,
    CONVERT(VARCHAR(10), t.PlatformStartDate, 23) AS bbvaStartDate,
    CONVERT(VARCHAR(10), p.HireDate, 23) AS softtekHireDate,
    CONVERT(VARCHAR(10), t.PlatformStartDate, 23) AS platformStartDate,
    CONVERT(VARCHAR(10), p.HireDate, 23) AS hireDate,
    CONVERT(VARCHAR(10), t.EntryDate, 23) AS entryDate,
    CASE
      WHEN lifecycle.EventType=N'COLLABORATOR_TO_TALENT' THEN lifecycle.EffectiveDate
      WHEN lifecycle.EffectiveDate IS NOT NULL AND CONVERT(date,t.CreatedAt) < CONVERT(date,lifecycle.EffectiveDate) THEN CONVERT(VARCHAR(10),t.CreatedAt,23)
      WHEN lifecycle.EffectiveDate IS NOT NULL THEN lifecycle.EffectiveDate
      WHEN t.EntryDate IS NOT NULL AND CONVERT(date,t.CreatedAt) < t.EntryDate THEN CONVERT(VARCHAR(10),t.CreatedAt,23)
      ELSE COALESCE(CONVERT(VARCHAR(10),t.EntryDate,23),CONVERT(VARCHAR(10),t.CreatedAt,23))
    END AS bankSinceDate,
    entryStats.EntryCount AS talentBankEntryCount,
    p.Notes AS notes,
    lifecycle.ReasonCode AS lifecycleReasonCode,
    lifecycle.ReasonName AS lifecycleReasonName,
    lifecycle.EffectiveDate AS lifecycleEffectiveDate,
    lifecycle.Notes AS lifecycleNotes,
    CONVERT(VARCHAR(33), t.ConvertedAt, 127) AS convertedAt,
    d.FileName AS cvFileName,
    d.ContentType AS cvContentType,
    d.FileSizeBytes AS cvFileSizeBytes,
    CONVERT(VARCHAR(33), d.UpdatedAt, 127) AS cvUpdatedAt,
    CONVERT(VARCHAR(33), t.CreatedAt, 127) AS createdAt,
    CONVERT(VARCHAR(33), t.UpdatedAt, 127) AS updatedAt,
    t.CreatedByEmail AS createdByEmail,
    t.UpdatedByEmail AS updatedByEmail
  FROM bbva.TalentBankEntry t
  INNER JOIN bbva.Person p ON p.Id = t.PersonId
  LEFT JOIN bbva.PersonDocument d ON d.PersonId = p.Id AND d.DocumentType = N'CV'
  OUTER APPLY (
    SELECT COUNT(1) AS EntryCount
    FROM bbva.TalentBankEntry allEntries
    WHERE allEntries.PersonId=p.Id
  ) entryStats
  OUTER APPLY (
    SELECT TOP 1
      h.EventType,
      h.ReasonCode,
      r.Name AS ReasonName,
      CONVERT(VARCHAR(10), h.EffectiveDate, 23) AS EffectiveDate,
      h.Notes
    FROM bbva.PersonLifecycleHistory h
    LEFT JOIN bbva.LifecycleReasonCatalog r ON r.Code=h.ReasonCode
    WHERE h.PersonId=p.Id AND h.EventType IN (N'COLLABORATOR_TO_TALENT',N'ENTERED_TALENT_BANK')
    ORDER BY h.CreatedAt DESC,h.Id DESC
  ) lifecycle
`;

interface TalentRow extends Omit<TalentRecord, 'cv' | 'daysInTalentBank' | 'urgentAssignment'> {
  bankSinceDate: string | null;
  cvFileName: string | null;
  cvContentType: string | null;
  cvFileSizeBytes: number | null;
  cvUpdatedAt: string | null;
}

function mapTalent(row: TalentRow): TalentRecord {
  const { bankSinceDate: _legacyBankSinceDate, cvFileName, cvContentType, cvFileSizeBytes, cvUpdatedAt, ...base } = row;
  const referenceDate = bbvaBusinessDate();
  const entry = base.entryDate ? Date.parse(`${base.entryDate}T00:00:00Z`) : Number.NaN;
  const reference = Date.parse(`${referenceDate}T00:00:00Z`);
  const daysInTalentBank = Number.isFinite(entry) && Number.isFinite(reference) ? Math.max(0, Math.floor((reference - entry) / 86400000)) : 0;
  const talentBankEntryCount = Number(base.talentBankEntryCount ?? 1);
  return {
    ...base,
    entryDate: base.entryDate,
    daysInTalentBank,
    talentBankEntryCount,
    urgentAssignment: daysInTalentBank > 60,
    cv: cvFileName
      ? {
          fileName: cvFileName,
          contentType: cvContentType || 'application/octet-stream',
          fileSizeBytes: Number(cvFileSizeBytes || 0),
          updatedAt: cvUpdatedAt || base.updatedAt,
        }
      : null,
  };
}

function bindPerson(request: sql.Request, input: TalentInput) {
  return request
    .input('softtekCode', sql.NVarChar(80), input.softtekCode || null)
    .input('bbvaUser', sql.NVarChar(100), input.bbvaUser || null)
    .input('softtekEmail', sql.NVarChar(255), input.softtekEmail)
    .input('bbvaEmail', sql.NVarChar(255), input.bbvaEmail || null)
    .input('firstName', sql.NVarChar(120), input.firstName)
    .input('lastName', sql.NVarChar(180), input.lastName || null)
    .input('profile', sql.NVarChar(120), input.profile || null)
    .input('profileCatalogId', sql.UniqueIdentifier, input.profileCatalogId || null)
    .input('technologyProfile', sql.NVarChar(120), input.technologyProfile || null)
    .input('technologyProfileCatalogId', sql.UniqueIdentifier, input.technologyProfileCatalogId || null)
    .input('currentTechnology', sql.NVarChar(120), input.currentTechnology || null)
    .input('currentTechnologyCatalogId', sql.UniqueIdentifier, input.currentTechnologyCatalogId || null)
    .input('expertise', sql.NVarChar(40), input.expertise || null)
    .input('softtekHireDate', sql.Date, input.softtekHireDate || null)
    .input('notes', sql.NVarChar(2000), input.notes || null);
}

function bindEntry(request: sql.Request, input: TalentInput) {
  return request
    .input('talentType', sql.NVarChar(30), input.talentType)
    .input('affiliationType', sql.NVarChar(16), input.affiliationType)
    .input('stage', sql.NVarChar(30), input.stage)
    .input('active', sql.Bit, input.active)
    .input('bbvaStartDate', sql.Date, input.bbvaStartDate || null)
    .input('entryDate', sql.Date, input.entryDate);
}

function historyMessageForCreate(input: TalentInput): string {
  if (input.talentType === 'ACADEMY') return 'El talento fue registrado como integrante de Academia.';
  if (input.talentType === 'BBVA_EXIT') return 'El colaborador fue dado de baja de BBVA y trasladado a Banco de talento.';
  return 'El prospecto fue registrado en Banco de talento.';
}

function stageDescription(stage: TalentStage): string {
  const labels: Record<TalentStage, string> = {
    REGISTERED: 'Registrado',
    ACADEMY: 'Academia',
    TRAINING: 'Capacitación',
    EVALUATION: 'Evaluación',
    AVAILABLE: 'Disponible',
    UNASSIGNED: 'Desasignado',
    CONVERTED: 'Convertido',
  };
  return `La etapa del talento cambió a ${labels[stage]}.`;
}

export class TalentRepository {
  async list(): Promise<TalentRecord[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`${TALENT_SELECT} WHERE t.Stage <> N'CONVERTED' ORDER BY t.UpdatedAt DESC, p.FirstName ASC;`);
    return (result.recordset as TalentRow[]).map(mapTalent);
  }

  async findById(id: string): Promise<TalentRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`${TALENT_SELECT} WHERE t.Id = @id AND t.Stage <> N'CONVERTED';`);
    const row = result.recordset[0] as TalentRow | undefined;
    return row ? mapTalent(row) : null;
  }

  async create(input: TalentInput, actorEmail: string): Promise<TalentRecord> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const personRequest = bindPerson(new sql.Request(transaction), input).input('actorEmail', sql.NVarChar(255), actorEmail);
      const personResult = await personRequest.query(`
        INSERT INTO bbva.Person (
          SofttekCode, CorporateUser, Email, BbvaUser, SofttekEmail, BbvaEmail, FirstName, LastName, Profile, ProfileCatalogId, TechnologyProfile, TechnologyProfileCatalogId,
          CurrentTechnology, CurrentTechnologyCatalogId, Expertise, HireDate, Notes, CreatedByEmail, UpdatedByEmail
        )
        OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id
        VALUES (
          @softtekCode, @bbvaUser, @softtekEmail, @bbvaUser, @softtekEmail, @bbvaEmail, @firstName, @lastName, @profile, @profileCatalogId, @technologyProfile, @technologyProfileCatalogId,
          @currentTechnology, @currentTechnologyCatalogId, @expertise, @softtekHireDate, @notes, @actorEmail, @actorEmail
        );
      `);
      const personId = String(personResult.recordset[0].id);

      const entryRequest = bindEntry(new sql.Request(transaction), input)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('actorEmail', sql.NVarChar(255), actorEmail);
      const entryResult = await entryRequest.query(`
        INSERT INTO bbva.TalentBankEntry (
          PersonId, TalentType, AffiliationType, Stage, Active, PlatformStartDate,
          EntryDate, CreatedByEmail, UpdatedByEmail
        )
        OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id
        VALUES (
          @personId, @talentType, @affiliationType, @stage, @active, @bbvaStartDate,
          @entryDate, @actorEmail, @actorEmail
        );
      `);
      const entryId = String(entryResult.recordset[0].id);

      await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, entryId)
        .input('description', sql.NVarChar(500), historyMessageForCreate(input))
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.TalentHistory (TalentBankEntryId, EventType, Description, CreatedByEmail) VALUES (@entryId, N'CREATED', @description, @actorEmail);`);

      await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('effectiveDate', sql.Date, input.entryDate)
        .input('description', sql.NVarChar(500), historyMessageForCreate(input))
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.PersonLifecycleHistory (PersonId,EventType,ToState,EffectiveDate,Description,CreatedByEmail)
                VALUES (@personId,N'ENTERED_TALENT_BANK',N'TALENT_BANK',@effectiveDate,@description,@actorEmail);`);

      await transaction.commit();
      const created = await this.findById(entryId);
      if (!created) throw new Error('No fue posible recuperar el talento creado.');
      return created;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(id: string, input: TalentInput, actorEmail: string): Promise<TalentRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;
    if (current.recordStatus === 'DELETED') throw new Error('El talento está eliminado y sólo puede consultarse.');

    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const lock = await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .query(`SELECT Stage,DeletedAt,CONVERT(VARCHAR(33),UpdatedAt,127) AS updatedAt FROM bbva.TalentBankEntry WITH (UPDLOCK,HOLDLOCK) WHERE Id=@id;`);
      const locked = lock.recordset[0] as { Stage?: string; DeletedAt?: Date | null; updatedAt?: string } | undefined;
      if (!locked || locked.DeletedAt || locked.Stage === 'CONVERTED') {
        throw Object.assign(new Error('El talento cambió de estado en otra vista. Actualiza la pantalla antes de continuar.'), { statusCode: 409 });
      }
      if (input.expectedUpdatedAt && locked.updatedAt !== input.expectedUpdatedAt) {
        throw Object.assign(new Error('La información cambió en otra vista. Actualiza la pantalla antes de guardar para evitar sobrescribir cambios recientes.'), { statusCode: 409 });
      }

      await bindPerson(new sql.Request(transaction), input)
        .input('personId', sql.UniqueIdentifier, current.personId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.Person
          SET SofttekCode=@softtekCode, CorporateUser=@bbvaUser, Email=@softtekEmail, BbvaUser=@bbvaUser, SofttekEmail=@softtekEmail, BbvaEmail=@bbvaEmail,
              FirstName=@firstName, LastName=@lastName, Profile=@profile, ProfileCatalogId=@profileCatalogId,
              TechnologyProfile=@technologyProfile, TechnologyProfileCatalogId=@technologyProfileCatalogId, CurrentTechnology=@currentTechnology,
              CurrentTechnologyCatalogId=@currentTechnologyCatalogId, Expertise=@expertise, HireDate=@softtekHireDate, Notes=@notes,
              UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail
          WHERE Id=@personId;
        `);

      await bindEntry(new sql.Request(transaction), input)
        .input('id', sql.UniqueIdentifier, id)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.TalentBankEntry
          SET TalentType=@talentType, AffiliationType=@affiliationType, Stage=@stage, Active=@active,
              PlatformStartDate=@bbvaStartDate,
              EntryDate=@entryDate, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail
          WHERE Id=@id;
        `);

      await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, id)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.TalentHistory (TalentBankEntryId, EventType, Description, CreatedByEmail) VALUES (@entryId, N'UPDATED', N'La información del talento fue actualizada.', @actorEmail);`);

      await transaction.commit();
      return this.findById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateStage(id: string, stage: TalentStage, actorEmail: string): Promise<TalentRecord | null> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const lock = await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .query(`SELECT Stage,Active,DeletedAt FROM bbva.TalentBankEntry WITH (UPDLOCK,HOLDLOCK) WHERE Id=@id;`);
      const current = lock.recordset[0] as { Stage?: string; Active?: boolean; DeletedAt?: Date | null } | undefined;
      if (!current) {
        await transaction.rollback();
        return null;
      }
      if (current.DeletedAt || String(current.Stage).toUpperCase() === 'CONVERTED' || !current.Active) {
        throw Object.assign(new Error('El talento ya no está activo y su etapa no puede modificarse.'), { statusCode: 409 });
      }

      await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .input('stage', sql.NVarChar(30), stage)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`UPDATE bbva.TalentBankEntry SET Stage=@stage, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail WHERE Id=@id AND Active=1 AND DeletedAt IS NULL AND Stage<>N'CONVERTED';`);

      await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, id)
        .input('description', sql.NVarChar(500), stageDescription(stage))
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.TalentHistory (TalentBankEntryId, EventType, Description, CreatedByEmail) VALUES (@entryId, N'STAGE_CHANGED', @description, @actorEmail);`);

      await transaction.commit();
      return this.findById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }


  async delete(id: string, actorEmail: string): Promise<boolean> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const lock = await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, id)
        .query(`SELECT CAST(PersonId AS NVARCHAR(36)) AS personId,Stage,DeletedAt FROM bbva.TalentBankEntry WITH (UPDLOCK,HOLDLOCK) WHERE Id=@entryId;`);
      const current = lock.recordset[0] as { personId?: string; Stage?: string; DeletedAt?: Date | null } | undefined;
      if (!current) {
        await transaction.commit();
        return false;
      }
      if (current.DeletedAt) {
        await transaction.commit();
        return true;
      }
      if (String(current.Stage).toUpperCase() === 'CONVERTED') {
        throw Object.assign(new Error('El talento ya fue convertido a colaborador y no puede eliminarse desde Banco de talento.'), { statusCode: 409 });
      }

      await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, id)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.TalentBankEntry
          SET Active=0, DeletedAt=SYSUTCDATETIME(), DeletedByEmail=@actorEmail,
              UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail
          WHERE Id=@entryId AND DeletedAt IS NULL AND Stage<>N'CONVERTED';

          INSERT INTO bbva.TalentHistory (TalentBankEntryId, EventType, Description, CreatedByEmail)
          VALUES (@entryId, N'LOGICALLY_DELETED', N'El registro fue eliminado de Banco de talento.', @actorEmail);
        `);
      await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, current.personId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO bbva.PersonLifecycleHistory (PersonId,EventType,Description,CreatedByEmail)
          VALUES (@personId,N'TALENT_LOGICAL_DELETE',N'El registro de Banco de talento fue eliminado.',@actorEmail);
        `);
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }


  async listHistory(id: string): Promise<TalentHistoryRecord[]> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`
      SELECT CAST(Id AS NVARCHAR(36)) AS id, EventType AS eventType, Description AS description,
             CONVERT(VARCHAR(33), CreatedAt, 127) AS createdAt, CreatedByEmail AS createdByEmail
      FROM bbva.TalentHistory WHERE TalentBankEntryId=@id ORDER BY CreatedAt DESC;
    `);
    return result.recordset as TalentHistoryRecord[];
  }

  async saveCv(id: string, cv: TalentCvInput, actorEmail: string): Promise<TalentRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;
    if (current.recordStatus === 'DELETED') throw new Error('El talento está eliminado y no puede modificarse.');

    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, current.personId)
        .input('fileName', sql.NVarChar(255), cv.fileName)
        .input('contentType', sql.NVarChar(150), cv.contentType)
        .input('fileExtension', sql.NVarChar(10), cv.fileExtension)
        .input('fileSizeBytes', sql.Int, cv.fileSizeBytes)
        .input('fileContent', sql.VarBinary(sql.MAX), cv.content)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          MERGE bbva.PersonDocument AS target
          USING (SELECT @personId AS PersonId, N'CV' AS DocumentType) AS source
          ON target.PersonId=source.PersonId AND target.DocumentType=source.DocumentType
          WHEN MATCHED THEN UPDATE SET FileName=@fileName, ContentType=@contentType, FileExtension=@fileExtension,
            FileSizeBytes=@fileSizeBytes, FileContent=@fileContent, UpdatedAt=SYSUTCDATETIME(), UploadedByEmail=@actorEmail
          WHEN NOT MATCHED THEN INSERT (PersonId, DocumentType, FileName, ContentType, FileExtension, FileSizeBytes, FileContent, UploadedByEmail)
            VALUES (@personId, N'CV', @fileName, @contentType, @fileExtension, @fileSizeBytes, @fileContent, @actorEmail);
        `);

      await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, id)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.TalentHistory (TalentBankEntryId, EventType, Description, CreatedByEmail) VALUES (@entryId, N'CV_UPDATED', N'El CV del talento fue actualizado.', @actorEmail);`);

      await transaction.commit();
      return this.findById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getCv(id: string): Promise<TalentCvRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`
      SELECT d.FileName AS fileName, d.ContentType AS contentType, d.FileSizeBytes AS fileSizeBytes,
             CONVERT(VARCHAR(33), d.UpdatedAt, 127) AS updatedAt, d.FileContent AS fileContent
      FROM bbva.TalentBankEntry t
      INNER JOIN bbva.PersonDocument d ON d.PersonId=t.PersonId AND d.DocumentType=N'CV'
      WHERE t.Id=@id AND t.Stage<>N'CONVERTED';
    `);
    const row = result.recordset[0] as any;
    if (!row) return null;
    return {
      fileName: row.fileName,
      contentType: row.contentType,
      fileSizeBytes: Number(row.fileSizeBytes),
      updatedAt: row.updatedAt,
      base64: Buffer.from(row.fileContent).toString('base64'),
    };
  }
}
