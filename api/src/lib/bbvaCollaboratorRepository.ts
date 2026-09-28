import sql from 'mssql';
import { getDbConnection } from './db.js';
import { BBVA_SQL_BUSINESS_DATE } from './bbvaBusinessTime.js';
import type { CollaboratorInput, CollaboratorRecord } from './bbvaCollaboratorDomain.js';

const COLLABORATOR_SELECT = `
  SELECT
    CAST(c.Id AS NVARCHAR(36)) AS id,
    CAST(p.Id AS NVARCHAR(36)) AS personId,
    p.SofttekCode AS softtekCode,
    COALESCE(p.BbvaUser,p.CorporateUser) AS bbvaUser,
    COALESCE(p.SofttekEmail,p.Email) AS softtekEmail,
    p.BbvaEmail AS bbvaEmail,
    c.DeliveryManager AS deliveryManager,
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
    c.Status AS status,
    CONVERT(VARCHAR(10), c.StartDate, 23) AS bbvaStartDate,
    CONVERT(VARCHAR(10), p.HireDate, 23) AS softtekHireDate,
    p.OriginalFullName AS originalFullName,
    p.BbvaStructureLevel2 AS bbvaStructureLevel2,
    p.BbvaStructureLevel3 AS bbvaStructureLevel3,
    CONVERT(VARCHAR(10), p.BbvaAccessEndDate, 23) AS bbvaAccessEndDate,
    p.BbvaAccessAuthorizer AS bbvaAccessAuthorizer,
    p.BbvaAccessStatus AS bbvaAccessStatus,
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
    ISNULL(certStats.criticalCount,0) AS certificationCritical,
    CONVERT(VARCHAR(33), c.CreatedAt, 127) AS createdAt,
    CONVERT(VARCHAR(33), c.UpdatedAt, 127) AS updatedAt
  FROM bbva.Collaborator c
  INNER JOIN bbva.Person p ON p.Id=c.PersonId
  LEFT JOIN bbva.PersonDocument d ON d.PersonId=p.Id AND d.DocumentType=N'CV'
  OUTER APPLY (
    SELECT
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus<>N'NOT_APPLICABLE' THEN 1 END) AS applicable,
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus=N'APPROVED' AND (pc.ExpirationDate IS NULL OR (pc.ExpirationDate >= ${BBVA_SQL_BUSINESS_DATE} AND (cc.ExpiringSoonDays IS NULL OR pc.ExpirationDate > DATEADD(day,cc.ExpiringSoonDays,${BBVA_SQL_BUSINESS_DATE})))) THEN 1 END) AS validCount,
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus=N'APPROVED' AND cc.ExpiringSoonDays IS NOT NULL AND pc.ExpirationDate IS NOT NULL AND pc.ExpirationDate >= ${BBVA_SQL_BUSINESS_DATE} AND pc.ExpirationDate <= DATEADD(day,cc.ExpiringSoonDays,${BBVA_SQL_BUSINESS_DATE}) THEN 1 END) AS expiringCount,
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus=N'APPROVED' AND pc.ExpirationDate IS NOT NULL AND pc.ExpirationDate < ${BBVA_SQL_BUSINESS_DATE} AND cc.RecertificationEnabled=0 THEN 1 END) AS expiredCount,
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus IN (N'PENDING',N'SCHEDULED',N'APPLIED',N'FAILED') THEN 1 END) AS pendingCount,
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus=N'APPROVED' AND pc.ExpirationDate IS NOT NULL AND pc.ExpirationDate < ${BBVA_SQL_BUSINESS_DATE} AND cc.RecertificationEnabled=1 THEN 1 END) AS recertificationPendingCount,
      COUNT(CASE WHEN pc.Applicable=1 AND pc.BaseStatus=N'FAILED' AND cc.RequiresAttempts=1 AND cc.MaxAttempts=2 AND cc.CertificationType IN (N'DEVELOPMENT_SECURITY',N'TECHNOLOGICAL',N'NORMATIVE_TESTING') AND ISNULL(attemptStats.failedAttemptCount,0) >= 2 AND ISNULL(criticalResolution.ResolutionStatus,N'PENDING_REVIEW') IN (N'PENDING_REVIEW',N'LOW_REQUESTED') THEN 1 END) AS criticalCount
    FROM bbva.PersonCertification pc
    INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
    OUTER APPLY (
      SELECT COUNT(1) AS failedAttemptCount
      FROM bbva.PersonCertificationAttempt ca
      WHERE ca.PersonCertificationId=pc.Id
        AND ca.CycleNumber=pc.CurrentCycle
        AND ca.Result=N'FAILED'
    ) attemptStats
    OUTER APPLY (
      SELECT TOP 1 r.ResolutionStatus
      FROM bbva.CertificationCriticalResolution r
      WHERE r.PersonCertificationId=pc.Id AND r.CycleNumber=pc.CurrentCycle
      ORDER BY r.UpdatedAt DESC,r.Id DESC
    ) criticalResolution
    WHERE pc.PersonId=p.Id
  ) certStats
`;

function bindPerson(request: sql.Request, input: CollaboratorInput) {
  return request
    .input('softtekCode', sql.NVarChar(80), input.softtekCode)
    .input('bbvaUser', sql.NVarChar(100), input.bbvaUser)
    .input('softtekEmail', sql.NVarChar(255), input.softtekEmail)
    .input('bbvaEmail', sql.NVarChar(255), input.bbvaEmail)
    .input('deliveryManager', sql.NVarChar(180), input.deliveryManager)
    .input('firstName', sql.NVarChar(120), input.firstName)
    .input('lastName', sql.NVarChar(180), input.lastName)
    .input('profile', sql.NVarChar(120), input.profile)
    .input('profileCatalogId', sql.UniqueIdentifier, input.profileCatalogId)
    .input('technologyProfile', sql.NVarChar(120), input.technologyProfile)
    .input('technologyProfileCatalogId', sql.UniqueIdentifier, input.technologyProfileCatalogId)
    .input('currentTechnology', sql.NVarChar(120), input.currentTechnology)
    .input('currentTechnologyCatalogId', sql.UniqueIdentifier, input.currentTechnologyCatalogId)
    .input('expertise', sql.NVarChar(40), input.expertise)
    .input('softtekHireDate', sql.Date, input.softtekHireDate)
    .input('originalFullName', sql.NVarChar(300), input.originalFullName)
    .input('bbvaStructureLevel2', sql.NVarChar(220), input.bbvaStructureLevel2)
    .input('bbvaStructureLevel3', sql.NVarChar(220), input.bbvaStructureLevel3)
    .input('bbvaAccessEndDate', sql.Date, input.bbvaAccessEndDate)
    .input('bbvaAccessAuthorizer', sql.NVarChar(220), input.bbvaAccessAuthorizer)
    .input('bbvaAccessStatus', sql.NVarChar(100), input.bbvaAccessStatus)
    .input('notes', sql.NVarChar(2000), input.notes);
}

async function upsertManualProvenance(transaction: sql.Transaction, personId: string, input: CollaboratorInput, actorEmail: string, current?: CollaboratorRecord | null): Promise<void> {
  const entries: Array<[string, unknown, unknown]> = [
    ['SofttekCode',input.softtekCode,current?.softtekCode],['BbvaUser',input.bbvaUser,current?.bbvaUser],['SofttekEmail',input.softtekEmail,current?.softtekEmail],['BbvaEmail',input.bbvaEmail,current?.bbvaEmail],
    ['FirstName',input.firstName,current?.firstName],['LastName',input.lastName,current?.lastName],['Profile',input.profile,current?.profile],['TechnologyProfile',input.technologyProfile,current?.technologyProfile],
    ['CurrentTechnology',input.currentTechnology,current?.currentTechnology],['Expertise',input.expertise,current?.expertise],['SofttekHireDate',input.softtekHireDate,current?.softtekHireDate],['BbvaStartDate',input.bbvaStartDate,current?.bbvaStartDate],
    ['DeliveryManager',input.deliveryManager,current?.deliveryManager],['BbvaStructureLevel2',input.bbvaStructureLevel2,current?.bbvaStructureLevel2],['BbvaStructureLevel3',input.bbvaStructureLevel3,current?.bbvaStructureLevel3],
    ['BbvaAccessEndDate',input.bbvaAccessEndDate,current?.bbvaAccessEndDate],['BbvaAccessAuthorizer',input.bbvaAccessAuthorizer,current?.bbvaAccessAuthorizer],['BbvaAccessStatus',input.bbvaAccessStatus,current?.bbvaAccessStatus],
  ];
  const comparable = (value: unknown) => String(value ?? '').trim();
  for (const [fieldName, raw, previous] of entries) {
    if (current && comparable(raw) === comparable(previous)) continue;
    if (raw === null || raw === undefined || String(raw).trim() === '') continue;
    await new sql.Request(transaction)
      .input('personId',sql.UniqueIdentifier,personId).input('fieldName',sql.NVarChar(80),fieldName)
      .input('sourceValue',sql.NVarChar(1500),String(raw)).input('actorEmail',sql.NVarChar(255),actorEmail)
      .query(`MERGE bbva.PersonFieldProvenance AS target
              USING (SELECT @personId AS PersonId,@fieldName AS FieldName,N'MANUAL' AS SourceType) AS source
              ON target.PersonId=source.PersonId AND target.FieldName=source.FieldName AND target.SourceType=source.SourceType
              WHEN MATCHED THEN UPDATE SET SourceValue=@sourceValue,LastSeenAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
              WHEN NOT MATCHED THEN INSERT(PersonId,FieldName,SourceType,SourceValue,CreatedByEmail,UpdatedByEmail) VALUES(@personId,@fieldName,N'MANUAL',@sourceValue,@actorEmail,@actorEmail);`);
  }
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
        .query(`INSERT INTO bbva.Person (Id,SofttekCode,CorporateUser,Email,BbvaUser,SofttekEmail,BbvaEmail,FirstName,LastName,Profile,ProfileCatalogId,TechnologyProfile,TechnologyProfileCatalogId,CurrentTechnology,CurrentTechnologyCatalogId,Expertise,HireDate,OriginalFullName,BbvaStructureLevel2,BbvaStructureLevel3,BbvaAccessEndDate,BbvaAccessAuthorizer,BbvaAccessStatus,Notes,CreatedByEmail,UpdatedByEmail)
                VALUES (@personId,@softtekCode,@bbvaUser,@softtekEmail,@bbvaUser,@softtekEmail,@bbvaEmail,@firstName,@lastName,@profile,@profileCatalogId,@technologyProfile,@technologyProfileCatalogId,@currentTechnology,@currentTechnologyCatalogId,@expertise,@softtekHireDate,@originalFullName,@bbvaStructureLevel2,@bbvaStructureLevel3,@bbvaAccessEndDate,@bbvaAccessAuthorizer,@bbvaAccessStatus,@notes,@actorEmail,@actorEmail);`);
      await new sql.Request(transaction)
        .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('status', sql.NVarChar(20), 'ACTIVE')
        .input('bbvaStartDate', sql.Date, input.bbvaStartDate)
        .input('deliveryManager', sql.NVarChar(180), input.deliveryManager)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.Collaborator (Id,PersonId,Status,StartDate,DeliveryManager,CreatedByEmail,UpdatedByEmail) VALUES (@collaboratorId,@personId,@status,@bbvaStartDate,@deliveryManager,@actorEmail,@actorEmail);
                INSERT INTO bbva.CollaboratorHistory (CollaboratorId,EventType,Description,CreatedByEmail) VALUES (@collaboratorId,N'CREATED',N'El colaborador fue registrado.',@actorEmail);`);
      await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, personId)
        .input('effectiveDate', sql.Date, input.bbvaStartDate || null)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.PersonLifecycleHistory (PersonId,EventType,ToState,EffectiveDate,Description,CreatedByEmail)
                VALUES (@personId,N'ENTERED_COLLABORATOR',N'COLLABORATOR',@effectiveDate,N'La persona ingresó a Colaboradores.',@actorEmail);`);
      await upsertManualProvenance(transaction, personId, input, actorEmail);
      await transaction.commit();
      return (await this.findById(collaboratorId)) as CollaboratorRecord;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(id: string, input: CollaboratorInput, actorEmail: string): Promise<CollaboratorRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const lock = await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .query(`SELECT Status,CONVERT(VARCHAR(33),UpdatedAt,127) AS updatedAt FROM bbva.Collaborator WITH (UPDLOCK,HOLDLOCK) WHERE Id=@id;`);
      const locked = lock.recordset[0] as { Status?: string; updatedAt?: string } | undefined;
      if (!locked || locked.Status !== 'ACTIVE') {
        throw Object.assign(new Error('El colaborador cambió de estado en otra vista. Actualiza la pantalla antes de continuar.'), { statusCode: 409 });
      }
      if (input.expectedUpdatedAt && locked.updatedAt !== input.expectedUpdatedAt) {
        throw Object.assign(new Error('La información cambió en otra vista. Actualiza la pantalla antes de guardar para evitar sobrescribir cambios recientes.'), { statusCode: 409 });
      }

      await bindPerson(new sql.Request(transaction), input)
        .input('personId', sql.UniqueIdentifier, current.personId)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`UPDATE bbva.Person SET SofttekCode=@softtekCode,CorporateUser=@bbvaUser,Email=@softtekEmail,BbvaUser=@bbvaUser,SofttekEmail=@softtekEmail,BbvaEmail=@bbvaEmail,FirstName=@firstName,LastName=@lastName,Profile=@profile,ProfileCatalogId=@profileCatalogId,TechnologyProfile=@technologyProfile,TechnologyProfileCatalogId=@technologyProfileCatalogId,CurrentTechnology=@currentTechnology,CurrentTechnologyCatalogId=@currentTechnologyCatalogId,Expertise=@expertise,HireDate=@softtekHireDate,OriginalFullName=@originalFullName,BbvaStructureLevel2=@bbvaStructureLevel2,BbvaStructureLevel3=@bbvaStructureLevel3,BbvaAccessEndDate=@bbvaAccessEndDate,BbvaAccessAuthorizer=@bbvaAccessAuthorizer,BbvaAccessStatus=@bbvaAccessStatus,Notes=@notes,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@personId;`);
      await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .input('bbvaStartDate', sql.Date, input.bbvaStartDate)
        .input('deliveryManager', sql.NVarChar(180), input.deliveryManager)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`UPDATE bbva.Collaborator SET StartDate=@bbvaStartDate,DeliveryManager=@deliveryManager,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@id AND Status=N'ACTIVE';
                INSERT INTO bbva.CollaboratorHistory (CollaboratorId,EventType,Description,CreatedByEmail) VALUES (@id,N'UPDATED',N'La información del colaborador fue actualizada.',@actorEmail);`);
      await upsertManualProvenance(transaction, current.personId, input, actorEmail, current);
      await transaction.commit();
      return this.findById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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
