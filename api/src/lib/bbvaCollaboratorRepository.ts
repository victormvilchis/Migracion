import sql from 'mssql';
import { getDbConnection } from './db.js';
import type { CollaboratorInput, CollaboratorRecord } from './bbvaCollaboratorDomain.js';

const COLLABORATOR_SELECT = `
  SELECT
    CAST(c.Id AS NVARCHAR(36)) AS id,
    CAST(p.Id AS NVARCHAR(36)) AS personId,
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
    c.Status AS status,
    CONVERT(VARCHAR(10), c.StartDate, 23) AS startDate,
    CONVERT(VARCHAR(10), c.EndDate, 23) AS endDate,
    CONVERT(VARCHAR(10), p.HireDate, 23) AS hireDate,
    p.Notes AS notes,
    CASE WHEN d.Id IS NULL THEN CAST(0 AS BIT) ELSE CAST(1 AS BIT) END AS hasCv,
    CONVERT(VARCHAR(33), c.CreatedAt, 127) AS createdAt,
    CONVERT(VARCHAR(33), c.UpdatedAt, 127) AS updatedAt
  FROM bbva.Collaborator c
  INNER JOIN bbva.Person p ON p.Id=c.PersonId
  LEFT JOIN bbva.PersonDocument d ON d.PersonId=p.Id AND d.DocumentType=N'CV'
`;

function bindPerson(request: sql.Request, input: CollaboratorInput) {
  return request
    .input('softtekCode', sql.NVarChar(80), input.softtekCode)
    .input('corporateUser', sql.NVarChar(100), input.corporateUser)
    .input('email', sql.NVarChar(255), input.email)
    .input('firstName', sql.NVarChar(120), input.firstName)
    .input('lastName', sql.NVarChar(180), input.lastName)
    .input('profile', sql.NVarChar(120), input.profile)
    .input('technologyProfile', sql.NVarChar(120), input.technologyProfile)
    .input('currentTechnology', sql.NVarChar(120), input.currentTechnology)
    .input('expertise', sql.NVarChar(40), input.expertise)
    .input('hireDate', sql.Date, input.hireDate)
    .input('notes', sql.NVarChar(2000), input.notes);
}

export class CollaboratorRepository {
  async list(): Promise<CollaboratorRecord[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`${COLLABORATOR_SELECT} ORDER BY p.FirstName ASC, p.LastName ASC;`);
    return result.recordset as CollaboratorRecord[];
  }

  async findById(id: string): Promise<CollaboratorRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`${COLLABORATOR_SELECT} WHERE c.Id=@id;`);
    return (result.recordset[0] as CollaboratorRecord | undefined) ?? null;
  }

  async create(input: CollaboratorInput, actorEmail: string): Promise<CollaboratorRecord> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const personId = crypto.randomUUID();
      const collaboratorId = crypto.randomUUID();
      await bindPerson(new sql.Request(transaction), input)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.Person (Id, SofttekCode, CorporateUser, Email, FirstName, LastName, Profile, TechnologyProfile, CurrentTechnology, Expertise, HireDate, Notes, CreatedByEmail, UpdatedByEmail)
                VALUES (@personId,@softtekCode,@corporateUser,@email,@firstName,@lastName,@profile,@technologyProfile,@currentTechnology,@expertise,@hireDate,@notes,@actorEmail,@actorEmail);`);
      await new sql.Request(transaction)
        .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('status', sql.NVarChar(20), input.startDate ? 'ACTIVE' : 'INACTIVE')
        .input('startDate', sql.Date, input.startDate)
        .input('endDate', sql.Date, input.endDate)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.Collaborator (Id,PersonId,Status,StartDate,EndDate,CreatedByEmail,UpdatedByEmail) VALUES (@collaboratorId,@personId,@status,@startDate,@endDate,@actorEmail,@actorEmail);
                INSERT INTO bbva.CollaboratorHistory (CollaboratorId,EventType,Description,CreatedByEmail) VALUES (@collaboratorId,N'CREATED',N'El colaborador fue registrado.',@actorEmail);`);
      await transaction.commit();
      return (await this.findById(collaboratorId)) as CollaboratorRecord;
    } catch (error) { await transaction.rollback(); throw error; }
  }

  async update(id: string, input: CollaboratorInput, actorEmail: string): Promise<CollaboratorRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await bindPerson(new sql.Request(transaction), input)
        .input('personId', sql.UniqueIdentifier, current.personId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`UPDATE bbva.Person SET SofttekCode=@softtekCode,CorporateUser=@corporateUser,Email=@email,FirstName=@firstName,LastName=@lastName,Profile=@profile,TechnologyProfile=@technologyProfile,CurrentTechnology=@currentTechnology,Expertise=@expertise,HireDate=@hireDate,Notes=@notes,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@personId;`);
      await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .input('status', sql.NVarChar(20), input.startDate ? 'ACTIVE' : 'INACTIVE')
        .input('startDate', sql.Date, input.startDate)
        .input('endDate', sql.Date, input.endDate)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`UPDATE bbva.Collaborator SET Status=@status,StartDate=@startDate,EndDate=@endDate,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@id;
                INSERT INTO bbva.CollaboratorHistory (CollaboratorId,EventType,Description,CreatedByEmail) VALUES (@id,N'UPDATED',N'La información del colaborador fue actualizada.',@actorEmail);`);
      await transaction.commit();
      return this.findById(id);
    } catch (error) { await transaction.rollback(); throw error; }
  }

  async delete(id: string): Promise<boolean> {
    const current = await this.findById(id);
    if (!current) return false;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await new sql.Request(transaction).input('id', sql.UniqueIdentifier, id).query(`DELETE FROM bbva.CollaboratorHistory WHERE CollaboratorId=@id; DELETE FROM bbva.Collaborator WHERE Id=@id;`);
      await new sql.Request(transaction).input('personId', sql.UniqueIdentifier, current.personId).query(`DELETE FROM bbva.PersonDocument WHERE PersonId=@personId; DELETE FROM bbva.Person WHERE Id=@personId;`);
      await transaction.commit();
      return true;
    } catch (error) { await transaction.rollback(); throw error; }
  }
}
