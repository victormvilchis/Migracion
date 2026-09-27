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
    CAST(p.ProfileCatalogId AS NVARCHAR(36)) AS profileCatalogId,
    p.TechnologyProfile AS technologyProfile,
    CAST(p.TechnologyProfileCatalogId AS NVARCHAR(36)) AS technologyProfileCatalogId,
    p.CurrentTechnology AS currentTechnology,
    CAST(p.CurrentTechnologyCatalogId AS NVARCHAR(36)) AS currentTechnologyCatalogId,
    p.Expertise AS expertise,
    c.Status AS status,
    CONVERT(VARCHAR(10), c.StartDate, 23) AS startDate,
    CONVERT(VARCHAR(10), p.HireDate, 23) AS hireDate,
    p.Notes AS notes,
    CASE WHEN d.Id IS NULL THEN CAST(0 AS BIT) ELSE CAST(1 AS BIT) END AS hasCv,
    ISNULL(certStats.applicable,0) AS certificationApplicable,
    ISNULL(certStats.validCount,0) AS certificationValid,
    ISNULL(certStats.expiringCount,0) AS certificationExpiring,
    ISNULL(certStats.expiredCount,0) AS certificationExpired,
    ISNULL(certStats.pendingCount,0) AS certificationPending,
    ISNULL(certStats.recertificationPendingCount,0) AS certificationRecertificationPending,
    CONVERT(VARCHAR(33), c.CreatedAt, 127) AS createdAt,
    CONVERT(VARCHAR(33), c.UpdatedAt, 127) AS updatedAt
  FROM bbva.Collaborator c
  INNER JOIN bbva.Person p ON p.Id=c.PersonId
  LEFT JOIN bbva.PersonDocument d ON d.PersonId=p.Id AND d.DocumentType=N'CV'
  OUTER APPLY (
    SELECT
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus<>N'NOT_APPLICABLE' THEN 1 END) AS applicable,
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus=N'APPROVED' AND (pc.ExpirationDate IS NULL OR (pc.ExpirationDate >= CONVERT(date,SYSUTCDATETIME()) AND (cc.ExpiringSoonDays IS NULL OR pc.ExpirationDate > DATEADD(day,cc.ExpiringSoonDays,CONVERT(date,SYSUTCDATETIME()))))) THEN 1 END) AS validCount,
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus=N'APPROVED' AND cc.ExpiringSoonDays IS NOT NULL AND pc.ExpirationDate IS NOT NULL AND pc.ExpirationDate >= CONVERT(date,SYSUTCDATETIME()) AND pc.ExpirationDate <= DATEADD(day,cc.ExpiringSoonDays,CONVERT(date,SYSUTCDATETIME())) THEN 1 END) AS expiringCount,
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus=N'APPROVED' AND pc.ExpirationDate IS NOT NULL AND pc.ExpirationDate < CONVERT(date,SYSUTCDATETIME()) AND cc.RecertificationEnabled=0 THEN 1 END) AS expiredCount,
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus IN (N'PENDING',N'SCHEDULED',N'APPLIED',N'FAILED') THEN 1 END) AS pendingCount,
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus=N'APPROVED' AND pc.ExpirationDate IS NOT NULL AND pc.ExpirationDate < CONVERT(date,SYSUTCDATETIME()) AND cc.RecertificationEnabled=1 THEN 1 END) AS recertificationPendingCount
    FROM bbva.PersonCertification pc
    INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
    WHERE pc.PersonId=p.Id
  ) certStats
`;

function bindPerson(request: sql.Request, input: CollaboratorInput) {
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
    .input('hireDate', sql.Date, input.hireDate)
    .input('notes', sql.NVarChar(2000), input.notes);
}

export class CollaboratorRepository {
  async list(): Promise<CollaboratorRecord[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`${COLLABORATOR_SELECT} WHERE c.Status=N'ACTIVE' ORDER BY p.FirstName ASC, p.LastName ASC;`);
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
        .query(`INSERT INTO bbva.Person (Id, SofttekCode, CorporateUser, Email, FirstName, LastName, Profile, ProfileCatalogId, TechnologyProfile, TechnologyProfileCatalogId, CurrentTechnology, CurrentTechnologyCatalogId, Expertise, HireDate, Notes, CreatedByEmail, UpdatedByEmail)
                VALUES (@personId,@softtekCode,@corporateUser,@email,@firstName,@lastName,@profile,@profileCatalogId,@technologyProfile,@technologyProfileCatalogId,@currentTechnology,@currentTechnologyCatalogId,@expertise,@hireDate,@notes,@actorEmail,@actorEmail);`);
      await new sql.Request(transaction)
        .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('status', sql.NVarChar(20), 'ACTIVE')
        .input('startDate', sql.Date, input.startDate)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.Collaborator (Id,PersonId,Status,StartDate,CreatedByEmail,UpdatedByEmail) VALUES (@collaboratorId,@personId,@status,@startDate,@actorEmail,@actorEmail);
                INSERT INTO bbva.CollaboratorHistory (CollaboratorId,EventType,Description,CreatedByEmail) VALUES (@collaboratorId,N'CREATED',N'El colaborador fue registrado.',@actorEmail);`);
      await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('effectiveDate', sql.Date, input.startDate || null)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.PersonLifecycleHistory (PersonId,EventType,ToState,EffectiveDate,Description,CreatedByEmail)
                VALUES (@personId,N'ENTERED_COLLABORATOR',N'COLLABORATOR',@effectiveDate,N'La persona ingresó a Colaboradores.',@actorEmail);`);
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
        .query(`UPDATE bbva.Person SET SofttekCode=@softtekCode,CorporateUser=@corporateUser,Email=@email,FirstName=@firstName,LastName=@lastName,Profile=@profile,ProfileCatalogId=@profileCatalogId,TechnologyProfile=@technologyProfile,TechnologyProfileCatalogId=@technologyProfileCatalogId,CurrentTechnology=@currentTechnology,CurrentTechnologyCatalogId=@currentTechnologyCatalogId,Expertise=@expertise,HireDate=@hireDate,Notes=@notes,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@personId;`);
      await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .input('startDate', sql.Date, input.startDate)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`UPDATE bbva.Collaborator SET StartDate=@startDate,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@id;
                INSERT INTO bbva.CollaboratorHistory (CollaboratorId,EventType,Description,CreatedByEmail) VALUES (@id,N'UPDATED',N'La información del colaborador fue actualizada.',@actorEmail);`);
      await transaction.commit();
      return this.findById(id);
    } catch (error) { await transaction.rollback(); throw error; }
  }

  async delete(id: string): Promise<boolean> {
    const current = await this.findById(id);
    if (!current) return false;
    throw Object.assign(
      new Error('Los colaboradores no se eliminan. Utiliza Mover a Banco de talento para conservar su identidad, certificaciones e historial.'),
      { statusCode: 409 },
    );
  }
}
