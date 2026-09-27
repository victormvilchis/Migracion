import sql from 'mssql';
import { getDbConnection } from './db.js';
import type { ImportChangeDecision } from './bbvaCollaboratorImportDomain.js';

export interface ImportPersonRecord {
  personId: string;
  collaboratorId: string | null;
  collaboratorStatus: 'ACTIVE' | 'INACTIVE' | null;
  activeTalentId: string | null;
  softtekCode: string | null;
  corporateUser: string | null;
  email: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  profile: string | null;
  profileCatalogId: string | null;
  technologyProfile: string | null;
  technologyProfileCatalogId: string | null;
  currentTechnology: string | null;
  currentTechnologyCatalogId: string | null;
  expertise: string | null;
  startDate: string | null;
  hireDate: string | null;
  notes: string | null;
}

export interface ImportPersonInput {
  softtekCode: string | null;
  corporateUser: string | null;
  email: string;
  firstName: string;
  lastName: string | null;
  profile: string | null;
  profileCatalogId: string | null;
  technologyProfile: string | null;
  technologyProfileCatalogId: string | null;
  currentTechnology: string | null;
  currentTechnologyCatalogId: string | null;
  expertise: string | null;
  startDate: string | null;
  hireDate: string | null;
  notes: string | null;
}

export interface CatalogLookup {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  seniority: string | null;
}

const PERSON_IMPORT_SELECT = `
  SELECT
    CAST(p.Id AS NVARCHAR(36)) AS personId,
    CAST(c.Id AS NVARCHAR(36)) AS collaboratorId,
    c.Status AS collaboratorStatus,
    CAST(tb.Id AS NVARCHAR(36)) AS activeTalentId,
    p.SofttekCode AS softtekCode,
    p.CorporateUser AS corporateUser,
    p.Email AS email,
    p.FirstName AS firstName,
    p.LastName AS lastName,
    LTRIM(RTRIM(CONCAT(p.FirstName,N' ',ISNULL(p.LastName,N'')))) AS fullName,
    p.Profile AS profile,
    CAST(p.ProfileCatalogId AS NVARCHAR(36)) AS profileCatalogId,
    p.TechnologyProfile AS technologyProfile,
    CAST(p.TechnologyProfileCatalogId AS NVARCHAR(36)) AS technologyProfileCatalogId,
    p.CurrentTechnology AS currentTechnology,
    CAST(p.CurrentTechnologyCatalogId AS NVARCHAR(36)) AS currentTechnologyCatalogId,
    p.Expertise AS expertise,
    CONVERT(VARCHAR(10),c.StartDate,23) AS startDate,
    CONVERT(VARCHAR(10),p.HireDate,23) AS hireDate,
    p.Notes AS notes
  FROM bbva.Person p
  LEFT JOIN bbva.Collaborator c ON c.PersonId=p.Id
  OUTER APPLY (
    SELECT TOP 1 t.Id
    FROM bbva.TalentBankEntry t
    WHERE t.PersonId=p.Id AND t.Active=1
    ORDER BY t.UpdatedAt DESC,t.CreatedAt DESC
  ) tb
`;

function bindPerson(request: sql.Request, input: ImportPersonInput): sql.Request {
  return request
    .input('softtekCode', sql.NVarChar(80), input.softtekCode)
    .input('corporateUser', sql.NVarChar(100), input.corporateUser)
    .input('email', sql.NVarChar(255), input.email)
    .input('firstName', sql.NVarChar(120), input.firstName)
    .input('lastName', sql.NVarChar(180), input.lastName)
    .input('profile', sql.NVarChar(120), input.profile)
    .input('profileCatalogId', sql.UniqueIdentifier, input.profileCatalogId)
    .input('technologyProfile', sql.NVarChar(120), input.technologyProfile)
    .input('technologyProfileCatalogId', sql.UniqueIdentifier, input.technologyProfileCatalogId)
    .input('currentTechnology', sql.NVarChar(120), input.currentTechnology)
    .input('currentTechnologyCatalogId', sql.UniqueIdentifier, input.currentTechnologyCatalogId)
    .input('expertise', sql.NVarChar(40), input.expertise)
    .input('startDate', sql.Date, input.startDate)
    .input('hireDate', sql.Date, input.hireDate)
    .input('notes', sql.NVarChar(2000), input.notes);
}

const catalogTables = {
  profile: 'bbva.CatalogProfile',
  technologyProfile: 'bbva.CatalogTechnologyProfile',
  technology: 'bbva.CatalogTechnology',
} as const;

type CatalogKind = keyof typeof catalogTables;

export class CollaboratorImportRepository {
  async listPeople(): Promise<ImportPersonRecord[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`${PERSON_IMPORT_SELECT} ORDER BY p.FirstName,p.LastName,p.Id;`);
    return result.recordset as ImportPersonRecord[];
  }

  async findCatalog(kind: CatalogKind, name: string): Promise<CatalogLookup | null> {
    const pool = await getDbConnection();
    const table = catalogTables[kind];
    const result = await pool.request().input('name', sql.NVarChar(180), name).query(`
      SELECT TOP 1 CAST(Id AS NVARCHAR(36)) AS id,Name AS name,Status AS status,Seniority AS seniority
      FROM ${table}
      WHERE UPPER(LTRIM(RTRIM(Name)))=UPPER(LTRIM(RTRIM(@name)));
    `);
    return (result.recordset[0] as CatalogLookup | undefined) ?? null;
  }

  async ensureCatalog(kind: CatalogKind, name: string, actorEmail: string, seniority?: string | null): Promise<CatalogLookup> {
    const existing = await this.findCatalog(kind, name);
    if (existing) {
      if (existing.status === 'INACTIVE') {
        const pool = await getDbConnection();
        const table = catalogTables[kind];
        await pool.request()
          .input('id', sql.UniqueIdentifier, existing.id)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`UPDATE ${table} SET Status=N'ACTIVE',UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@id;`);
        return { ...existing, status: 'ACTIVE' };
      }
      return existing;
    }

    const pool = await getDbConnection();
    const table = catalogTables[kind];
    const result = await pool.request()
      .input('name', sql.NVarChar(180), name)
      .input('seniority', sql.NVarChar(40), kind === 'profile' ? (seniority ?? null) : null)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`
        INSERT INTO ${table}(Name,Description,Seniority,Status,CreatedByEmail,UpdatedByEmail)
        OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id,INSERTED.Name AS name,INSERTED.Status AS status,INSERTED.Seniority AS seniority
        VALUES(@name,N'Creado automáticamente desde la importación Excel.',@seniority,N'ACTIVE',@actorEmail,@actorEmail);
      `);
    return result.recordset[0] as CatalogLookup;
  }

  async getStoredDecisions(resolutionKeys: string[]): Promise<Map<string, ImportChangeDecision>> {
    if (resolutionKeys.length === 0) return new Map();
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('keysJson', sql.NVarChar(sql.MAX), JSON.stringify(resolutionKeys))
      .query(`
        SELECT ResolutionKey AS resolutionKey,Decision AS decision
        FROM bbva.CollaboratorImportResolution
        WHERE ResolutionKey IN (SELECT [value] FROM OPENJSON(@keysJson));
      `);
    return new Map((result.recordset as Array<{ resolutionKey: string; decision: ImportChangeDecision }>).map((row) => [row.resolutionKey, row.decision]));
  }

  async saveDecision(resolutionKey: string, decision: ImportChangeDecision, actorEmail: string): Promise<void> {
    const pool = await getDbConnection();
    await pool.request()
      .input('resolutionKey', sql.NVarChar(96), resolutionKey)
      .input('decision', sql.NVarChar(24), decision)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`
        MERGE bbva.CollaboratorImportResolution AS target
        USING (SELECT @resolutionKey AS ResolutionKey) AS source
        ON target.ResolutionKey=source.ResolutionKey
        WHEN MATCHED THEN UPDATE SET Decision=@decision,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
        WHEN NOT MATCHED THEN INSERT(ResolutionKey,Decision,CreatedByEmail,UpdatedByEmail)
          VALUES(@resolutionKey,@decision,@actorEmail,@actorEmail);
      `);
  }

  async create(input: ImportPersonInput, actorEmail: string): Promise<{ collaboratorId: string; personId: string }> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const personId = crypto.randomUUID();
      const collaboratorId = crypto.randomUUID();
      await bindPerson(new sql.Request(transaction), input)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO bbva.Person(
            Id,SofttekCode,CorporateUser,Email,FirstName,LastName,Profile,ProfileCatalogId,
            TechnologyProfile,TechnologyProfileCatalogId,CurrentTechnology,CurrentTechnologyCatalogId,
            Expertise,HireDate,Notes,CreatedByEmail,UpdatedByEmail
          ) VALUES(
            @personId,@softtekCode,@corporateUser,@email,@firstName,@lastName,@profile,@profileCatalogId,
            @technologyProfile,@technologyProfileCatalogId,@currentTechnology,@currentTechnologyCatalogId,
            @expertise,@hireDate,@notes,@actorEmail,@actorEmail
          );
        `);
      await new sql.Request(transaction)
        .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('startDate', sql.Date, input.startDate)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO bbva.Collaborator(Id,PersonId,Status,StartDate,CreatedByEmail,UpdatedByEmail)
          VALUES(@collaboratorId,@personId,N'ACTIVE',@startDate,@actorEmail,@actorEmail);
          INSERT INTO bbva.CollaboratorHistory(CollaboratorId,EventType,Description,CreatedByEmail)
          VALUES(@collaboratorId,N'IMPORTED',N'El colaborador fue registrado mediante importación Excel.',@actorEmail);
          INSERT INTO bbva.PersonLifecycleHistory(PersonId,EventType,ToState,EffectiveDate,Description,CreatedByEmail)
          VALUES(@personId,N'ENTERED_COLLABORATOR',N'COLLABORATOR',@startDate,N'La persona ingresó a Colaboradores mediante importación Excel.',@actorEmail);
        `);
      await transaction.commit();
      return { collaboratorId, personId };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(record: ImportPersonRecord, input: ImportPersonInput, actorEmail: string): Promise<void> {
    if (!record.collaboratorId) throw Object.assign(new Error('La persona no tiene un registro de colaborador asociado.'), { statusCode: 409 });
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await bindPerson(new sql.Request(transaction), input)
        .input('personId', sql.UniqueIdentifier, record.personId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.Person SET
            SofttekCode=@softtekCode,CorporateUser=@corporateUser,Email=@email,FirstName=@firstName,LastName=@lastName,
            Profile=@profile,ProfileCatalogId=@profileCatalogId,TechnologyProfile=@technologyProfile,
            TechnologyProfileCatalogId=@technologyProfileCatalogId,CurrentTechnology=@currentTechnology,
            CurrentTechnologyCatalogId=@currentTechnologyCatalogId,Expertise=@expertise,HireDate=@hireDate,Notes=@notes,
            UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
          WHERE Id=@personId;
        `);
      await new sql.Request(transaction)
        .input('collaboratorId', sql.UniqueIdentifier, record.collaboratorId)
        .input('startDate', sql.Date, input.startDate)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.Collaborator SET StartDate=@startDate,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@collaboratorId;
          INSERT INTO bbva.CollaboratorHistory(CollaboratorId,EventType,Description,CreatedByEmail)
          VALUES(@collaboratorId,N'IMPORTED_UPDATE',N'La información del colaborador fue actualizada mediante importación Excel.',@actorEmail);
        `);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async reactivate(record: ImportPersonRecord, input: ImportPersonInput, actorEmail: string): Promise<string> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await bindPerson(new sql.Request(transaction), input)
        .input('personId', sql.UniqueIdentifier, record.personId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.Person SET
            SofttekCode=@softtekCode,CorporateUser=@corporateUser,Email=@email,FirstName=@firstName,LastName=@lastName,
            Profile=@profile,ProfileCatalogId=@profileCatalogId,TechnologyProfile=@technologyProfile,
            TechnologyProfileCatalogId=@technologyProfileCatalogId,CurrentTechnology=@currentTechnology,
            CurrentTechnologyCatalogId=@currentTechnologyCatalogId,Expertise=@expertise,HireDate=@hireDate,Notes=@notes,
            UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
          WHERE Id=@personId;
        `);

      let collaboratorId = record.collaboratorId;
      if (collaboratorId) {
        await new sql.Request(transaction)
          .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
          .input('startDate', sql.Date, input.startDate)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`
            UPDATE bbva.Collaborator SET Status=N'ACTIVE',StartDate=COALESCE(@startDate,StartDate),UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@collaboratorId;
            INSERT INTO bbva.CollaboratorHistory(CollaboratorId,EventType,Description,CreatedByEmail)
            VALUES(@collaboratorId,N'REACTIVATED_FROM_IMPORT',N'El colaborador fue reactivado mediante importación Excel.',@actorEmail);
          `);
      } else {
        collaboratorId = crypto.randomUUID();
        await new sql.Request(transaction)
          .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
          .input('personId', sql.UniqueIdentifier, record.personId)
          .input('startDate', sql.Date, input.startDate)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`
            INSERT INTO bbva.Collaborator(Id,PersonId,Status,StartDate,CreatedByEmail,UpdatedByEmail)
            VALUES(@collaboratorId,@personId,N'ACTIVE',@startDate,@actorEmail,@actorEmail);
            INSERT INTO bbva.CollaboratorHistory(CollaboratorId,EventType,Description,CreatedByEmail)
            VALUES(@collaboratorId,N'CREATED_FROM_IMPORT',N'El colaborador fue incorporado mediante importación Excel.',@actorEmail);
          `);
      }

      if (record.activeTalentId) {
        await new sql.Request(transaction)
          .input('talentId', sql.UniqueIdentifier, record.activeTalentId)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`
            UPDATE bbva.TalentBankEntry SET Active=0,Stage=N'CONVERTED',ConvertedAt=SYSUTCDATETIME(),UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@talentId;
            INSERT INTO bbva.TalentHistory(TalentBankEntryId,EventType,Description,CreatedByEmail)
            VALUES(@talentId,N'CONVERTED',N'La persona regresó a Colaboradores mediante importación Excel.',@actorEmail);
          `);
      }

      await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, record.personId)
        .input('effectiveDate', sql.Date, input.startDate)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO bbva.PersonLifecycleHistory(PersonId,EventType,FromState,ToState,EffectiveDate,Description,CreatedByEmail)
          VALUES(@personId,N'TALENT_TO_COLLABORATOR',N'TALENT_BANK',N'COLLABORATOR',@effectiveDate,N'La persona regresó a Colaboradores mediante importación Excel.',@actorEmail);
        `);

      await transaction.commit();
      return collaboratorId;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
