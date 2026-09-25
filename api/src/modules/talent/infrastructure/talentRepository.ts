import sql from 'mssql';
import { getDbConnection } from '../../../lib/db.js';
import type { TalentInput, TalentRecord, TalentStage } from '../domain/talent.js';

const TALENT_SELECT = `
  SELECT
    CAST(Id AS NVARCHAR(36)) AS id,
    FullName AS fullName,
    Email AS email,
    Profile AS profile,
    TechnologyProfile AS technologyProfile,
    TargetTechnology AS targetTechnology,
    Stage AS stage,
    Active AS active,
    CONVERT(VARCHAR(10), EntryDate, 23) AS entryDate,
    CONVERT(VARCHAR(33), ConvertedAt, 127) AS convertedAt,
    Notes AS notes,
    CONVERT(VARCHAR(33), CreatedAt, 127) AS createdAt,
    CONVERT(VARCHAR(33), UpdatedAt, 127) AS updatedAt,
    CreatedByEmail AS createdByEmail,
    UpdatedByEmail AS updatedByEmail
  FROM dbo.Talent
`;

function bindTalentInputs(request: sql.Request, input: Required<Omit<TalentInput, 'entryDate'>> & { entryDate: string }) {
  return request
    .input('fullName', sql.NVarChar(200), input.fullName)
    .input('email', sql.NVarChar(255), input.email || null)
    .input('profile', sql.NVarChar(120), input.profile || null)
    .input('technologyProfile', sql.NVarChar(120), input.technologyProfile || null)
    .input('targetTechnology', sql.NVarChar(120), input.targetTechnology || null)
    .input('stage', sql.NVarChar(30), input.stage)
    .input('active', sql.Bit, input.active)
    .input('entryDate', sql.Date, input.entryDate)
    .input('notes', sql.NVarChar(1000), input.notes || null);
}

export class TalentRepository {
  async list(): Promise<TalentRecord[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`${TALENT_SELECT} ORDER BY UpdatedAt DESC, FullName ASC;`);
    return result.recordset as TalentRecord[];
  }

  async findById(id: string): Promise<TalentRecord | null> {
    const pool = await getDbConnection();
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`${TALENT_SELECT} WHERE Id = @id;`);
    return (result.recordset[0] as TalentRecord | undefined) ?? null;
  }

  async create(
    input: Required<Omit<TalentInput, 'entryDate'>> & { entryDate: string },
    actorEmail: string
  ): Promise<TalentRecord> {
    const pool = await getDbConnection();
    const request = bindTalentInputs(pool.request(), input).input('actorEmail', sql.NVarChar(255), actorEmail);

    const result = await request.query(`
      INSERT INTO dbo.Talent (
        FullName, Email, Profile, TechnologyProfile, TargetTechnology,
        Stage, Active, EntryDate, Notes, ConvertedAt, CreatedByEmail, UpdatedByEmail
      )
      OUTPUT
        CAST(INSERTED.Id AS NVARCHAR(36)) AS id,
        INSERTED.FullName AS fullName,
        INSERTED.Email AS email,
        INSERTED.Profile AS profile,
        INSERTED.TechnologyProfile AS technologyProfile,
        INSERTED.TargetTechnology AS targetTechnology,
        INSERTED.Stage AS stage,
        INSERTED.Active AS active,
        CONVERT(VARCHAR(10), INSERTED.EntryDate, 23) AS entryDate,
        CONVERT(VARCHAR(33), INSERTED.ConvertedAt, 127) AS convertedAt,
        INSERTED.Notes AS notes,
        CONVERT(VARCHAR(33), INSERTED.CreatedAt, 127) AS createdAt,
        CONVERT(VARCHAR(33), INSERTED.UpdatedAt, 127) AS updatedAt,
        INSERTED.CreatedByEmail AS createdByEmail,
        INSERTED.UpdatedByEmail AS updatedByEmail
      VALUES (
        @fullName, @email, @profile, @technologyProfile, @targetTechnology,
        @stage, @active, @entryDate, @notes,
        CASE WHEN @stage = 'CONVERTED' THEN SYSUTCDATETIME() ELSE NULL END,
        @actorEmail, @actorEmail
      );
    `);

    return result.recordset[0] as TalentRecord;
  }

  async update(
    id: string,
    input: Required<Omit<TalentInput, 'entryDate'>> & { entryDate: string },
    actorEmail: string
  ): Promise<TalentRecord | null> {
    const pool = await getDbConnection();
    const request = bindTalentInputs(pool.request(), input)
      .input('id', sql.UniqueIdentifier, id)
      .input('actorEmail', sql.NVarChar(255), actorEmail);

    await request.query(`
      UPDATE dbo.Talent
      SET
        FullName = @fullName,
        Email = @email,
        Profile = @profile,
        TechnologyProfile = @technologyProfile,
        TargetTechnology = @targetTechnology,
        Stage = @stage,
        Active = @active,
        EntryDate = @entryDate,
        Notes = @notes,
        ConvertedAt = CASE
          WHEN @stage = 'CONVERTED' AND ConvertedAt IS NULL THEN SYSUTCDATETIME()
          WHEN @stage <> 'CONVERTED' THEN NULL
          ELSE ConvertedAt
        END,
        UpdatedAt = SYSUTCDATETIME(),
        UpdatedByEmail = @actorEmail
      WHERE Id = @id;
    `);

    return this.findById(id);
  }

  async updateStage(id: string, stage: TalentStage, actorEmail: string): Promise<TalentRecord | null> {
    const pool = await getDbConnection();
    await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .input('stage', sql.NVarChar(30), stage)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`
        UPDATE dbo.Talent
        SET
          Stage = @stage,
          ConvertedAt = CASE
            WHEN @stage = 'CONVERTED' AND ConvertedAt IS NULL THEN SYSUTCDATETIME()
            WHEN @stage <> 'CONVERTED' THEN NULL
            ELSE ConvertedAt
          END,
          UpdatedAt = SYSUTCDATETIME(),
          UpdatedByEmail = @actorEmail
        WHERE Id = @id;
      `);

    return this.findById(id);
  }
}
