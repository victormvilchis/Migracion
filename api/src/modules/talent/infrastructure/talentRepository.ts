import sql from 'mssql';
import { getDbConnection } from '../../../lib/db.js';
import type { TalentCvInput, TalentCvRecord, TalentHistoryRecord, TalentInput, TalentRecord, TalentStage } from '../domain/talent.js';

const TALENT_SELECT = `
  SELECT
    CAST(t.Id AS NVARCHAR(36)) AS id,
    CAST(p.Id AS NVARCHAR(36)) AS personId,
    t.TalentType AS talentType,
    p.SofttekCode AS softtekCode,
    p.CorporateUser AS corporateUser,
    p.Email AS email,
    p.FirstName AS firstName,
    p.LastName AS lastName,
    LTRIM(RTRIM(CONCAT(p.FirstName, N' ', ISNULL(p.LastName, N'')))) AS fullName,
    p.Profile AS profile,
    p.TechnologyProfile AS technologyProfile,
    p.CurrentTechnology AS currentTechnology,
    p.Expertise AS expertise,
    t.Stage AS stage,
    t.Active AS active,
    CONVERT(VARCHAR(10), t.PlatformStartDate, 23) AS platformStartDate,
    CONVERT(VARCHAR(10), t.PlatformEndDate, 23) AS platformEndDate,
    CONVERT(VARCHAR(10), p.HireDate, 23) AS hireDate,
    CONVERT(VARCHAR(10), t.EntryDate, 23) AS entryDate,
    p.Notes AS notes,
    CONVERT(VARCHAR(33), t.ConvertedAt, 127) AS convertedAt,
    d.FileName AS cvFileName,
    d.ContentType AS cvContentType,
    d.FileSizeBytes AS cvFileSizeBytes,
    CONVERT(VARCHAR(33), d.UpdatedAt, 127) AS cvUpdatedAt,
    CONVERT(VARCHAR(33), t.CreatedAt, 127) AS createdAt,
    CONVERT(VARCHAR(33), t.UpdatedAt, 127) AS updatedAt,
    t.CreatedByEmail AS createdByEmail,
    t.UpdatedByEmail AS updatedByEmail
  FROM dbo.TalentBankEntry t
  INNER JOIN dbo.Person p ON p.Id = t.PersonId
  LEFT JOIN dbo.PersonDocument d ON d.PersonId = p.Id AND d.DocumentType = N'CV'
`;

interface TalentRow extends Omit<TalentRecord, 'cv'> {
  cvFileName: string | null;
  cvContentType: string | null;
  cvFileSizeBytes: number | null;
  cvUpdatedAt: string | null;
}

function mapTalent(row: TalentRow): TalentRecord {
  const { cvFileName, cvContentType, cvFileSizeBytes, cvUpdatedAt, ...base } = row;
  return {
    ...base,
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
    .input('corporateUser', sql.NVarChar(100), input.corporateUser || null)
    .input('email', sql.NVarChar(255), input.email)
    .input('firstName', sql.NVarChar(120), input.firstName)
    .input('lastName', sql.NVarChar(180), input.lastName || null)
    .input('profile', sql.NVarChar(120), input.profile || null)
    .input('technologyProfile', sql.NVarChar(120), input.technologyProfile || null)
    .input('currentTechnology', sql.NVarChar(120), input.currentTechnology || null)
    .input('expertise', sql.NVarChar(40), input.expertise || null)
    .input('hireDate', sql.Date, input.hireDate || null)
    .input('notes', sql.NVarChar(2000), input.notes || null);
}

function bindEntry(request: sql.Request, input: TalentInput) {
  return request
    .input('talentType', sql.NVarChar(30), input.talentType)
    .input('stage', sql.NVarChar(30), input.stage)
    .input('active', sql.Bit, input.active)
    .input('platformStartDate', sql.Date, input.platformStartDate || null)
    .input('platformEndDate', sql.Date, input.platformEndDate || null)
    .input('entryDate', sql.Date, input.entryDate);
}

function historyMessageForCreate(input: TalentInput): string {
  if (input.talentType === 'ACADEMY') return 'El talento fue registrado como integrante de Academia.';
  if (input.talentType === 'BBVA_EXIT') return 'El colaborador fue dado de baja de BBVA y trasladado a Talent Bank.';
  return 'El prospecto fue registrado en Talent Bank.';
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
        INSERT INTO dbo.Person (
          SofttekCode, CorporateUser, Email, FirstName, LastName, Profile, TechnologyProfile,
          CurrentTechnology, Expertise, HireDate, Notes, CreatedByEmail, UpdatedByEmail
        )
        OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id
        VALUES (
          @softtekCode, @corporateUser, @email, @firstName, @lastName, @profile, @technologyProfile,
          @currentTechnology, @expertise, @hireDate, @notes, @actorEmail, @actorEmail
        );
      `);
      const personId = String(personResult.recordset[0].id);

      const entryRequest = bindEntry(new sql.Request(transaction), input)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('actorEmail', sql.NVarChar(255), actorEmail);
      const entryResult = await entryRequest.query(`
        INSERT INTO dbo.TalentBankEntry (
          PersonId, TalentType, Stage, Active, PlatformStartDate, PlatformEndDate,
          EntryDate, CreatedByEmail, UpdatedByEmail
        )
        OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id
        VALUES (
          @personId, @talentType, @stage, @active, @platformStartDate, @platformEndDate,
          @entryDate, @actorEmail, @actorEmail
        );
      `);
      const entryId = String(entryResult.recordset[0].id);

      await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, entryId)
        .input('description', sql.NVarChar(500), historyMessageForCreate(input))
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO dbo.TalentHistory (TalentBankEntryId, EventType, Description, CreatedByEmail) VALUES (@entryId, N'CREATED', @description, @actorEmail);`);

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

    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await bindPerson(new sql.Request(transaction), input)
        .input('personId', sql.UniqueIdentifier, current.personId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE dbo.Person
          SET SofttekCode=@softtekCode, CorporateUser=@corporateUser, Email=@email,
              FirstName=@firstName, LastName=@lastName, Profile=@profile,
              TechnologyProfile=@technologyProfile, CurrentTechnology=@currentTechnology,
              Expertise=@expertise, HireDate=@hireDate, Notes=@notes,
              UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail
          WHERE Id=@personId;
        `);

      await bindEntry(new sql.Request(transaction), input)
        .input('id', sql.UniqueIdentifier, id)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE dbo.TalentBankEntry
          SET TalentType=@talentType, Stage=@stage, Active=@active,
              PlatformStartDate=@platformStartDate, PlatformEndDate=@platformEndDate,
              EntryDate=@entryDate, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail
          WHERE Id=@id;
        `);

      await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, id)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO dbo.TalentHistory (TalentBankEntryId, EventType, Description, CreatedByEmail) VALUES (@entryId, N'UPDATED', N'La información del talento fue actualizada.', @actorEmail);`);

      await transaction.commit();
      return this.findById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateStage(id: string, stage: TalentStage, actorEmail: string): Promise<TalentRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .input('stage', sql.NVarChar(30), stage)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`UPDATE dbo.TalentBankEntry SET Stage=@stage, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail WHERE Id=@id;`);

      await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, id)
        .input('description', sql.NVarChar(500), stageDescription(stage))
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO dbo.TalentHistory (TalentBankEntryId, EventType, Description, CreatedByEmail) VALUES (@entryId, N'STAGE_CHANGED', @description, @actorEmail);`);

      await transaction.commit();
      return this.findById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }


  async convertToCollaborator(id: string, actorEmail: string): Promise<{ collaboratorId: string; talent: TalentRecord } | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const existing = await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, current.personId)
        .query(`
          SELECT TOP 1 CAST(Id AS NVARCHAR(36)) AS id
          FROM dbo.Collaborator
          WHERE PersonId=@personId;
        `);

      let collaboratorId: string;
      if (existing.recordset[0]?.id) {
        collaboratorId = String(existing.recordset[0].id);
        await new sql.Request(transaction)
          .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
          .input('startDate', sql.Date, current.platformStartDate || current.entryDate || null)
          .input('endDate', sql.Date, current.platformEndDate || null)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`
            UPDATE dbo.Collaborator
            SET Status=N'ACTIVE',
                StartDate=COALESCE(@startDate, StartDate),
                EndDate=@endDate,
                UpdatedAt=SYSUTCDATETIME(),
                UpdatedByEmail=@actorEmail
            WHERE Id=@collaboratorId;
          `);
      } else {
        const created = await new sql.Request(transaction)
          .input('personId', sql.UniqueIdentifier, current.personId)
          .input('startDate', sql.Date, current.platformStartDate || current.entryDate || null)
          .input('endDate', sql.Date, current.platformEndDate || null)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`
            INSERT INTO dbo.Collaborator (
              PersonId, Status, StartDate, EndDate, CreatedByEmail, UpdatedByEmail
            )
            OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id
            VALUES (
              @personId, N'ACTIVE', @startDate, @endDate, @actorEmail, @actorEmail
            );
          `);
        collaboratorId = String(created.recordset[0].id);
      }

      await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE dbo.TalentBankEntry
          SET Stage=N'CONVERTED',
              Active=0,
              ConvertedAt=SYSUTCDATETIME(),
              UpdatedAt=SYSUTCDATETIME(),
              UpdatedByEmail=@actorEmail
          WHERE Id=@id;
        `);

      await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, id)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO dbo.TalentHistory (
            TalentBankEntryId, EventType, Description, CreatedByEmail
          )
          VALUES (
            @entryId,
            N'CONVERTED',
            N'El talento se convirtió correctamente en colaborador.',
            @actorEmail
          );
        `);

      await new sql.Request(transaction)
        .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO dbo.CollaboratorHistory (
            CollaboratorId, EventType, Description, CreatedByEmail
          )
          VALUES (
            @collaboratorId,
            N'CREATED_FROM_TALENT',
            N'El colaborador fue incorporado desde Talent Bank.',
            @actorEmail
          );
        `);

      await transaction.commit();

      return {
        collaboratorId,
        talent: {
          ...current,
          stage: 'CONVERTED',
          active: false,
          convertedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const current = await this.findById(id);
    if (!current) return false;

    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await new sql.Request(transaction).input('personId', sql.UniqueIdentifier, current.personId).query(`DELETE FROM dbo.PersonDocument WHERE PersonId=@personId;`);
      await new sql.Request(transaction).input('entryId', sql.UniqueIdentifier, id).query(`DELETE FROM dbo.TalentHistory WHERE TalentBankEntryId=@entryId;`);
      await new sql.Request(transaction).input('entryId', sql.UniqueIdentifier, id).query(`DELETE FROM dbo.TalentBankEntry WHERE Id=@entryId;`);
      await new sql.Request(transaction).input('personId', sql.UniqueIdentifier, current.personId).query(`DELETE FROM dbo.Person WHERE Id=@personId;`);
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
      FROM dbo.TalentHistory WHERE TalentBankEntryId=@id ORDER BY CreatedAt DESC;
    `);
    return result.recordset as TalentHistoryRecord[];
  }

  async saveCv(id: string, cv: TalentCvInput, actorEmail: string): Promise<TalentRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;

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
          MERGE dbo.PersonDocument AS target
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
        .query(`INSERT INTO dbo.TalentHistory (TalentBankEntryId, EventType, Description, CreatedByEmail) VALUES (@entryId, N'CV_UPDATED', N'El CV del talento fue actualizado.', @actorEmail);`);

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
      FROM dbo.TalentBankEntry t
      INNER JOIN dbo.PersonDocument d ON d.PersonId=t.PersonId AND d.DocumentType=N'CV'
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
