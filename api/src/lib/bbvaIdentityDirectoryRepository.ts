import sql from 'mssql';
import { getDbConnection } from './db.js';
import type { BbvaIdentityDirectoryRecord } from './bbvaIdentityDirectoryDomain.js';

export class BbvaIdentityDirectoryRepository {
  async findLocalByIs(isValue: string): Promise<BbvaIdentityDirectoryRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('softtekCode', sql.NVarChar(80), isValue)
      .query(`
        SELECT TOP 1
          p.SofttekCode AS [is],
          COALESCE(p.BbvaUser,p.CorporateUser) AS bbvaUser,
          COALESCE(p.SofttekEmail,p.Email) AS softtekEmail,
          p.BbvaEmail AS bbvaEmail,
          COALESCE(p.BbvaUser,p.CorporateUser) AS corporateUser,
          COALESCE(p.SofttekEmail,p.Email) AS email,
          p.FirstName AS firstName,
          p.LastName AS lastName,
          p.Profile AS profile,
          p.TechnologyProfile AS technologyProfile,
          p.CurrentTechnology AS currentTechnology,
          p.Expertise AS expertise,
          CONVERT(VARCHAR(10),p.HireDate,23) AS softtekHireDate,
          CONVERT(VARCHAR(10),p.HireDate,23) AS hireDate
        FROM bbva.Person p
        WHERE UPPER(LTRIM(RTRIM(p.SofttekCode)))=UPPER(LTRIM(RTRIM(@softtekCode)))
        ORDER BY p.UpdatedAt DESC,p.CreatedAt DESC;
      `);
    const row = result.recordset[0] as Omit<BbvaIdentityDirectoryRecord, 'source'> | undefined;
    return row ? { ...row, is: String(row.is).trim().toUpperCase(), source: 'BBVA Workspace' } : null;
  }
}
