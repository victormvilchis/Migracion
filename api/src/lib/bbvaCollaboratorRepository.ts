import sql from 'mssql';
import { getDbConnection } from './db.js';
import type { CollaboratorRecord } from './bbvaCollaboratorDomain.js';

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
}
