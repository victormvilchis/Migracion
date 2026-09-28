import sql from 'mssql';
import { getDbConnection } from './db.js';
import type { DashboardMetricCards, DashboardMetricSnapshotPoint } from './bbvaDashboardDomain.js';

export interface DashboardCollaboratorRow {
  collaboratorId: string;
  personId: string;
  fullName: string;
  email: string;
  softtekCode: string | null;
  bbvaUser: string | null;
  bbvaEmail: string | null;
  deliveryManager: string | null;
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
  certificationType: string;
  applicable: boolean;
  mandatory: boolean;
  baseStatus: string;
  expirationDate: string | null;
  recertificationEnabled: boolean;
  expiringSoonDays: number | null;
  maxAttempts: number | null;
  currentCycle: number;
  attemptCount: number;
  latestAttemptResult: string | null;
  scheduledDate: string | null;
  criticalResolutionStatus: string | null;
}

export class BbvaDashboardRepository {
  async collaborators(): Promise<DashboardCollaboratorRow[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT CAST(c.Id AS NVARCHAR(36)) AS collaboratorId,
             CAST(p.Id AS NVARCHAR(36)) AS personId,
             LTRIM(RTRIM(CONCAT(p.FirstName,N' ',ISNULL(p.LastName,N'')))) AS fullName,
             COALESCE(p.SofttekEmail,p.Email) AS email,
             p.SofttekCode AS softtekCode,
             COALESCE(p.BbvaUser,p.CorporateUser) AS bbvaUser,
             p.BbvaEmail AS bbvaEmail,
             c.DeliveryManager AS deliveryManager,
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
             cc.CertificationType AS certificationType,
             pc.Applicable AS applicable,pc.Mandatory AS mandatory,pc.BaseStatus AS baseStatus,
             CONVERT(VARCHAR(10),pc.ExpirationDate,23) AS expirationDate,
             cc.RecertificationEnabled AS recertificationEnabled,cc.ExpiringSoonDays AS expiringSoonDays,
             cc.MaxAttempts AS maxAttempts,pc.CurrentCycle AS currentCycle,
             (SELECT COUNT(1) FROM bbva.PersonCertificationAttempt a WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle) AS attemptCount,
             latestAttempt.Result AS latestAttemptResult,
             CONVERT(VARCHAR(10),pc.NextScheduledDate,23) AS scheduledDate,
             criticalResolution.ResolutionStatus AS criticalResolutionStatus
      FROM bbva.PersonCertification pc
      INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
      OUTER APPLY (
        SELECT TOP 1 a.Result
        FROM bbva.PersonCertificationAttempt a
        WHERE a.PersonCertificationId=pc.Id AND a.CycleNumber=pc.CurrentCycle
        ORDER BY a.AttemptNumber DESC,a.CreatedAt DESC,a.Id DESC
      ) latestAttempt
      OUTER APPLY (
        SELECT TOP 1 cr.ResolutionStatus
        FROM bbva.CertificationCriticalResolution cr
        WHERE cr.PersonCertificationId=pc.Id AND cr.CycleNumber=pc.CurrentCycle
        ORDER BY cr.UpdatedAt DESC,cr.Id DESC
      ) criticalResolution;
    `);
    return result.recordset.map((row: any) => ({
      ...row,
      applicable: Boolean(row.applicable),
      mandatory: Boolean(row.mandatory),
      recertificationEnabled: Boolean(row.recertificationEnabled),
      expiringSoonDays: row.expiringSoonDays === null ? null : Number(row.expiringSoonDays),
      maxAttempts: row.maxAttempts === null ? null : Number(row.maxAttempts),
      currentCycle: Number(row.currentCycle ?? 1),
      attemptCount: Number(row.attemptCount ?? 0),
    })) as DashboardCertificationRow[];
  }

  async metricHistory(days = 90, referenceDate: string): Promise<DashboardMetricSnapshotPoint[]> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('days', sql.Int, Math.max(1, Math.min(365, days)))
      .input('referenceDate', sql.Date, referenceDate)
      .query(`
      SELECT CONVERT(VARCHAR(10),SnapshotDate,23) AS snapshotDate,
             CollaboratorsActive AS collaboratorsActive,
             TalentBankActive AS talentBankActive,
             CertificationsApplicable AS certificationsApplicable,
             CAST(CoveragePercent AS FLOAT) AS coveragePercent,
             Expiring AS expiring,Expired AS expired,
             RecertificationPending AS recertificationPending,Pending AS pending,
             DataQualityPending AS dataQualityPending,
             CAST(VendorReadyPercent AS FLOAT) AS vendorReadyPercent,
             VendorPending AS vendorPending,VendorExitRequired AS vendorExitRequired,
             CONVERT(VARCHAR(33),CapturedAt,127) AS capturedAt
      FROM bbva.DashboardMetricSnapshot
      WHERE SnapshotDate >= DATEADD(day,-@days,@referenceDate)
      ORDER BY SnapshotDate ASC;
    `);
    return result.recordset.map((row: any) => ({
      ...row,
      collaboratorsActive: Number(row.collaboratorsActive ?? 0),
      talentBankActive: Number(row.talentBankActive ?? 0),
      certificationsApplicable: Number(row.certificationsApplicable ?? 0),
      coveragePercent: Number(row.coveragePercent ?? 0),
      expiring: Number(row.expiring ?? 0),
      expired: Number(row.expired ?? 0),
      recertificationPending: Number(row.recertificationPending ?? 0),
      pending: Number(row.pending ?? 0),
      dataQualityPending: Number(row.dataQualityPending ?? 0),
      vendorReadyPercent: Number(row.vendorReadyPercent ?? 0),
      vendorPending: Number(row.vendorPending ?? 0),
      vendorExitRequired: Number(row.vendorExitRequired ?? 0),
    })) as DashboardMetricSnapshotPoint[];
  }

  async upsertMetricSnapshot(cards: DashboardMetricCards, actorEmail: string, snapshotDate: string): Promise<void> {
    const pool = await getDbConnection();
    const request = pool.request()
      .input('collaboratorsActive', sql.Int, cards.collaboratorsActive)
      .input('talentBankActive', sql.Int, cards.talentBankActive)
      .input('certificationsApplicable', sql.Int, cards.certificationsApplicable)
      .input('coveragePercent', sql.Decimal(7, 2), cards.coveragePercent)
      .input('expiring', sql.Int, cards.expiring)
      .input('expired', sql.Int, cards.expired)
      .input('recertificationPending', sql.Int, cards.recertificationPending)
      .input('pending', sql.Int, cards.pending)
      .input('dataQualityPending', sql.Int, cards.dataQualityPending)
      .input('vendorReadyPercent', sql.Decimal(7, 2), cards.vendorReadyPercent)
      .input('vendorPending', sql.Int, cards.vendorPending)
      .input('vendorExitRequired', sql.Int, cards.vendorExitRequired)
      .input('actorEmail', sql.NVarChar(255), actorEmail || 'system@basebfs.local')
      .input('snapshotDate', sql.Date, snapshotDate);
    await request.query(`
      MERGE bbva.DashboardMetricSnapshot AS target
      USING (SELECT @snapshotDate AS SnapshotDate) AS source
      ON target.SnapshotDate=source.SnapshotDate
      WHEN MATCHED THEN UPDATE SET
        CollaboratorsActive=@collaboratorsActive,TalentBankActive=@talentBankActive,
        CertificationsApplicable=@certificationsApplicable,CoveragePercent=@coveragePercent,
        Expiring=@expiring,Expired=@expired,RecertificationPending=@recertificationPending,
        Pending=@pending,DataQualityPending=@dataQualityPending,
        VendorReadyPercent=@vendorReadyPercent,VendorPending=@vendorPending,
        VendorExitRequired=@vendorExitRequired,CapturedAt=SYSUTCDATETIME(),CapturedByEmail=@actorEmail
      WHEN NOT MATCHED THEN INSERT (
        SnapshotDate,CollaboratorsActive,TalentBankActive,CertificationsApplicable,CoveragePercent,
        Expiring,Expired,RecertificationPending,Pending,DataQualityPending,
        VendorReadyPercent,VendorPending,VendorExitRequired,CapturedAt,CapturedByEmail
      ) VALUES (
        source.SnapshotDate,@collaboratorsActive,@talentBankActive,@certificationsApplicable,@coveragePercent,
        @expiring,@expired,@recertificationPending,@pending,@dataQualityPending,
        @vendorReadyPercent,@vendorPending,@vendorExitRequired,SYSUTCDATETIME(),@actorEmail
      );
    `);
  }

  async filterOptions() {
    const pool = await getDbConnection();
    const [technologies, profiles, deliveryManagers] = await Promise.all([
      pool.request().query(`SELECT CAST(Id AS NVARCHAR(36)) AS id,Name AS name FROM bbva.CatalogTechnology WHERE Status=N'ACTIVE' ORDER BY Name;`),
      pool.request().query(`SELECT CAST(Id AS NVARCHAR(36)) AS id,Name AS name FROM bbva.CatalogProfile WHERE Status=N'ACTIVE' ORDER BY Name;`),
      pool.request().query(`SELECT DISTINCT LTRIM(RTRIM(DeliveryManager)) AS name FROM bbva.Collaborator WHERE Status=N'ACTIVE' AND NULLIF(LTRIM(RTRIM(DeliveryManager)),N'') IS NOT NULL ORDER BY name;`),
    ]);
    return {
      technologies: technologies.recordset as Array<{ id: string; name: string }>,
      profiles: profiles.recordset as Array<{ id: string; name: string }>,
      deliveryManagers: (deliveryManagers.recordset as Array<{ name: string }>).map((item) => item.name),
    };
  }
}
