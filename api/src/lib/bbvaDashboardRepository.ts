import { getDbConnection } from './db.js';

export interface DashboardCollaboratorRow {
  collaboratorId: string;
  personId: string;
  fullName: string;
  email: string;
  profileId: string | null;
  profile: string | null;
  technologyId: string | null;
  technology: string | null;
  startDate: string | null;
}

export interface DashboardTalentRow {
  id: string;
  personId: string;
  talentType: string;
  stage: string;
  entryDate: string;
  fullName: string;
  technologyId: string | null;
  profileId: string | null;
}

export interface DashboardCertificationRow {
  id: string;
  personId: string;
  certificationId: string;
  certificationName: string;
  applicable: boolean;
  mandatory: boolean;
  baseStatus: string;
  expirationDate: string | null;
  recertificationEnabled: boolean;
  expiringSoonDays: number | null;
}

export class BbvaDashboardRepository {
  async collaborators(): Promise<DashboardCollaboratorRow[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT CAST(c.Id AS NVARCHAR(36)) AS collaboratorId,
             CAST(p.Id AS NVARCHAR(36)) AS personId,
             LTRIM(RTRIM(CONCAT(p.FirstName,N' ',ISNULL(p.LastName,N'')))) AS fullName,
             p.Email AS email,
             CAST(p.ProfileCatalogId AS NVARCHAR(36)) AS profileId,
             p.Profile AS profile,
             CAST(p.CurrentTechnologyCatalogId AS NVARCHAR(36)) AS technologyId,
             p.CurrentTechnology AS technology,
             CONVERT(VARCHAR(10),c.StartDate,23) AS startDate
      FROM bbva.Collaborator c
      INNER JOIN bbva.Person p ON p.Id=c.PersonId
      WHERE c.Status=N'ACTIVE';
    `);
    return result.recordset as DashboardCollaboratorRow[];
  }

  async talent(): Promise<DashboardTalentRow[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT CAST(t.Id AS NVARCHAR(36)) AS id,CAST(p.Id AS NVARCHAR(36)) AS personId,
             t.TalentType AS talentType,t.Stage AS stage,CONVERT(VARCHAR(10),t.EntryDate,23) AS entryDate,
             LTRIM(RTRIM(CONCAT(p.FirstName,N' ',ISNULL(p.LastName,N'')))) AS fullName,
             CAST(p.CurrentTechnologyCatalogId AS NVARCHAR(36)) AS technologyId,
             CAST(p.ProfileCatalogId AS NVARCHAR(36)) AS profileId
      FROM bbva.TalentBankEntry t
      INNER JOIN bbva.Person p ON p.Id=t.PersonId
      WHERE t.Active=1;
    `);
    return result.recordset as DashboardTalentRow[];
  }

  async certifications(): Promise<DashboardCertificationRow[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT CAST(pc.Id AS NVARCHAR(36)) AS id,CAST(pc.PersonId AS NVARCHAR(36)) AS personId,
             CAST(pc.CertificationId AS NVARCHAR(36)) AS certificationId,cc.Name AS certificationName,
             pc.Applicable AS applicable,pc.Mandatory AS mandatory,pc.BaseStatus AS baseStatus,
             CONVERT(VARCHAR(10),pc.ExpirationDate,23) AS expirationDate,
             cc.RecertificationEnabled AS recertificationEnabled,cc.ExpiringSoonDays AS expiringSoonDays
      FROM bbva.PersonCertification pc
      INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId;
    `);
    return result.recordset.map((row: any) => ({
      ...row,
      applicable: Boolean(row.applicable),
      mandatory: Boolean(row.mandatory),
      recertificationEnabled: Boolean(row.recertificationEnabled),
      expiringSoonDays: row.expiringSoonDays === null ? null : Number(row.expiringSoonDays),
    })) as DashboardCertificationRow[];
  }

  async filterOptions() {
    const pool = await getDbConnection();
    const [technologies, profiles] = await Promise.all([
      pool.request().query(`SELECT CAST(Id AS NVARCHAR(36)) AS id,Name AS name FROM bbva.CatalogTechnology WHERE Status=N'ACTIVE' ORDER BY Name;`),
      pool.request().query(`SELECT CAST(Id AS NVARCHAR(36)) AS id,Name AS name FROM bbva.CatalogProfile WHERE Status=N'ACTIVE' ORDER BY Name;`),
    ]);
    return { technologies: technologies.recordset as Array<{ id: string; name: string }>, profiles: profiles.recordset as Array<{ id: string; name: string }> };
  }
}
