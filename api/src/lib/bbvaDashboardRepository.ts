import sql from 'mssql';
import { getDbConnection } from './db.js';
import type { DashboardActivityItem, DashboardMetricCards, DashboardMetricSnapshotPoint } from './bbvaDashboardDomain.js';

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
  technologyProfile: string | null;
  bbvaStructureLevel2: string | null;
  bbvaStructureLevel3: string | null;
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
  bbvaStructureLevel2: string | null;
  bbvaStructureLevel3: string | null;
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

export interface DashboardCertificationScoreRow {
  collaboratorId: string;
  personId: string;
  fullName: string;
  profileId: string | null;
  technologyId: string | null;
  deliveryManager: string | null;
  certificationId: string;
  certificationName: string;
  score10: number;
  applicationDate: string | null;
  attemptNumber: number | null;
  result: string | null;
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
             p.TechnologyProfile AS technologyProfile,
             p.BbvaStructureLevel2 AS bbvaStructureLevel2,
             p.BbvaStructureLevel3 AS bbvaStructureLevel3,
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
             CAST(p.ProfileCatalogId AS NVARCHAR(36)) AS profileId,
             p.BbvaStructureLevel2 AS bbvaStructureLevel2,
             p.BbvaStructureLevel3 AS bbvaStructureLevel3
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

  async certificationScores(): Promise<DashboardCertificationScoreRow[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT CAST(c.Id AS NVARCHAR(36)) AS collaboratorId,CAST(p.Id AS NVARCHAR(36)) AS personId,
             LTRIM(RTRIM(CONCAT(p.FirstName,N' ',ISNULL(p.LastName,N'')))) AS fullName,
             CAST(p.ProfileCatalogId AS NVARCHAR(36)) AS profileId,
             CAST(p.CurrentTechnologyCatalogId AS NVARCHAR(36)) AS technologyId,
             c.DeliveryManager AS deliveryManager,
             CAST(cc.Id AS NVARCHAR(36)) AS certificationId,cc.Name AS certificationName,
             scoreEvidence.Score10 AS score10,
             CONVERT(VARCHAR(10),scoreEvidence.ApplicationDate,23) AS applicationDate,
             scoreEvidence.AttemptNumber AS attemptNumber,
             scoreEvidence.Result AS result
      FROM bbva.Collaborator c
      INNER JOIN bbva.Person p ON p.Id=c.PersonId
      INNER JOIN bbva.PersonCertification pc ON pc.PersonId=p.Id
      INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
      OUTER APPLY (
        SELECT TOP 1 evidence.Score10,evidence.ApplicationDate,evidence.AttemptNumber,evidence.Result,evidence.EvidenceAt
        FROM (
          SELECT a.Score10,a.ApplicationDate,a.AttemptNumber,a.Result,a.CreatedAt AS EvidenceAt
          FROM bbva.PersonCertificationAttempt a
          WHERE a.PersonCertificationId=pc.Id AND a.Score10 IS NOT NULL AND a.Score10 BETWEEN 0 AND 10
          UNION ALL
          SELECT pc.LastScore10,pc.ApplicationDate,pc.ImportedAttemptNumber,COALESCE(pc.ImportedExamStatus,pc.BaseStatus),pc.LastImportedAt
          WHERE pc.LastScore10 IS NOT NULL AND pc.LastScore10 BETWEEN 0 AND 10
        ) evidence
        ORDER BY COALESCE(evidence.ApplicationDate,CONVERT(date,evidence.EvidenceAt)) DESC,
                 evidence.EvidenceAt DESC,evidence.AttemptNumber DESC
      ) scoreEvidence
      WHERE c.Status=N'ACTIVE' AND pc.Applicable=1 AND cc.TracksScore=1
        AND scoreEvidence.Score10 IS NOT NULL;
    `);
    return result.recordset.map((row:any) => ({
      ...row, score10:Number(row.score10), attemptNumber:row.attemptNumber===null?null:Number(row.attemptNumber),
    })) as DashboardCertificationScoreRow[];
  }

  async recentActivity(days = 30, limit = 12, referenceDate: string): Promise<DashboardActivityItem[]> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('days', sql.Int, Math.max(1, Math.min(365, days)))
      .input('limit', sql.Int, Math.max(1, Math.min(100, limit)))
      .input('referenceDate', sql.Date, referenceDate)
      .query(`
        WITH activity AS (
          SELECT
            CONCAT(N'COLLABORATOR:',CAST(h.Id AS NVARCHAR(36))) AS id,
            N'COLLABORATOR' AS category,
            h.EventType AS eventType,
            LTRIM(RTRIM(CONCAT(p.FirstName,N' ',ISNULL(p.LastName,N'')))) AS title,
            h.Description AS description,
            h.CreatedAt AS occurredAt,
            h.CreatedByEmail AS actorEmail,
            CAST(c.Id AS NVARCHAR(36)) AS collaboratorId,
            CAST(NULL AS NVARCHAR(36)) AS talentId,
            CAST(NULL AS NVARCHAR(36)) AS certificationRecordId,
            CAST(NULL AS NVARCHAR(220)) AS certificationName
          FROM bbva.CollaboratorHistory h
          INNER JOIN bbva.Collaborator c ON c.Id=h.CollaboratorId
          INNER JOIN bbva.Person p ON p.Id=c.PersonId
          WHERE h.CreatedAt >= DATEADD(day,-@days,CAST(@referenceDate AS DATETIME2))

          UNION ALL

          SELECT
            CONCAT(N'TALENT:',CAST(h.Id AS NVARCHAR(36))) AS id,
            N'TALENT' AS category,
            h.EventType AS eventType,
            LTRIM(RTRIM(CONCAT(p.FirstName,N' ',ISNULL(p.LastName,N'')))) AS title,
            h.Description AS description,
            h.CreatedAt AS occurredAt,
            h.CreatedByEmail AS actorEmail,
            CAST(NULL AS NVARCHAR(36)) AS collaboratorId,
            CAST(t.Id AS NVARCHAR(36)) AS talentId,
            CAST(NULL AS NVARCHAR(36)) AS certificationRecordId,
            CAST(NULL AS NVARCHAR(220)) AS certificationName
          FROM bbva.TalentHistory h
          INNER JOIN bbva.TalentBankEntry t ON t.Id=h.TalentBankEntryId
          INNER JOIN bbva.Person p ON p.Id=t.PersonId
          WHERE h.CreatedAt >= DATEADD(day,-@days,CAST(@referenceDate AS DATETIME2))

          UNION ALL

          SELECT
            CONCAT(N'CERTIFICATION:',CAST(h.Id AS NVARCHAR(36))) AS id,
            N'CERTIFICATION' AS category,
            h.EventType AS eventType,
            LTRIM(RTRIM(CONCAT(p.FirstName,N' ',ISNULL(p.LastName,N'')))) AS title,
            h.Description AS description,
            h.CreatedAt AS occurredAt,
            h.CreatedByEmail AS actorEmail,
            CAST(c.Id AS NVARCHAR(36)) AS collaboratorId,
            CAST(NULL AS NVARCHAR(36)) AS talentId,
            CAST(pc.Id AS NVARCHAR(36)) AS certificationRecordId,
            cc.Name AS certificationName
          FROM bbva.PersonCertificationHistory h
          INNER JOIN bbva.PersonCertification pc ON pc.Id=h.PersonCertificationId
          INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
          INNER JOIN bbva.Person p ON p.Id=pc.PersonId
          LEFT JOIN bbva.Collaborator c ON c.PersonId=p.Id AND c.Status=N'ACTIVE'
          WHERE h.CreatedAt >= DATEADD(day,-@days,CAST(@referenceDate AS DATETIME2))
            AND h.EventType<>N'IMPORTED_RECONCILIATION'
        )
        SELECT TOP (@limit)
          id,category,eventType,title,description,
          CONVERT(VARCHAR(33),occurredAt,127) AS occurredAt,
          actorEmail,collaboratorId,talentId,certificationRecordId,certificationName
        FROM activity
        ORDER BY occurredAt DESC,id DESC;
      `);
    return result.recordset as DashboardActivityItem[];
  }

  async metricHistory(days = 90, referenceDate: string, quarterCode = 'GLOBAL'): Promise<DashboardMetricSnapshotPoint[]> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('days', sql.Int, Math.max(1, Math.min(365, days)))
      .input('referenceDate', sql.Date, referenceDate)
      .input('quarterCode', sql.NVarChar(16), quarterCode)
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
        AND QuarterCode=@quarterCode
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

  async upsertMetricSnapshot(cards: DashboardMetricCards, actorEmail: string, snapshotDate: string, quarterCode = 'GLOBAL'): Promise<void> {
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
      .input('snapshotDate', sql.Date, snapshotDate)
      .input('quarterCode', sql.NVarChar(16), quarterCode);
    await request.query(`
      MERGE bbva.DashboardMetricSnapshot AS target
      USING (SELECT @snapshotDate AS SnapshotDate,@quarterCode AS QuarterCode) AS source
      ON target.SnapshotDate=source.SnapshotDate AND target.QuarterCode=source.QuarterCode
      WHEN MATCHED THEN UPDATE SET
        CollaboratorsActive=@collaboratorsActive,TalentBankActive=@talentBankActive,
        CertificationsApplicable=@certificationsApplicable,CoveragePercent=@coveragePercent,
        Expiring=@expiring,Expired=@expired,RecertificationPending=@recertificationPending,
        Pending=@pending,DataQualityPending=@dataQualityPending,
        VendorReadyPercent=@vendorReadyPercent,VendorPending=@vendorPending,
        VendorExitRequired=@vendorExitRequired,CapturedAt=SYSUTCDATETIME(),CapturedByEmail=@actorEmail
      WHEN NOT MATCHED THEN INSERT (
        SnapshotDate,QuarterCode,CollaboratorsActive,TalentBankActive,CertificationsApplicable,CoveragePercent,
        Expiring,Expired,RecertificationPending,Pending,DataQualityPending,
        VendorReadyPercent,VendorPending,VendorExitRequired,CapturedAt,CapturedByEmail
      ) VALUES (
        source.SnapshotDate,source.QuarterCode,@collaboratorsActive,@talentBankActive,@certificationsApplicable,@coveragePercent,
        @expiring,@expired,@recertificationPending,@pending,@dataQualityPending,
        @vendorReadyPercent,@vendorPending,@vendorExitRequired,SYSUTCDATETIME(),@actorEmail
      );
    `);
  }

  async filterOptions() {
    const pool = await getDbConnection();
    const [technologies, profiles, certifications, technologyProfiles, bbvaStructuresLevel2, bbvaStructuresLevel3, deliveryManagers] = await Promise.all([
      pool.request().query(`SELECT CAST(Id AS NVARCHAR(36)) AS id,Name AS name FROM bbva.CatalogTechnology WHERE Status=N'ACTIVE' ORDER BY Name;`),
      pool.request().query(`SELECT CAST(Id AS NVARCHAR(36)) AS id,Name AS name FROM bbva.CatalogProfile WHERE Status=N'ACTIVE' ORDER BY Name;`),
      pool.request().query(`SELECT CAST(Id AS NVARCHAR(36)) AS id,Name AS name FROM bbva.CertificationCatalog WHERE Status=N'ACTIVE' ORDER BY Name;`),
      pool.request().query(`SELECT DISTINCT LTRIM(RTRIM(TechnologyProfile)) AS name FROM bbva.Person WHERE NULLIF(LTRIM(RTRIM(TechnologyProfile)),N'') IS NOT NULL ORDER BY name;`),
      pool.request().query(`SELECT DISTINCT LTRIM(RTRIM(BbvaStructureLevel2)) AS name FROM bbva.Person WHERE NULLIF(LTRIM(RTRIM(BbvaStructureLevel2)),N'') IS NOT NULL ORDER BY name;`),
      pool.request().query(`SELECT DISTINCT LTRIM(RTRIM(BbvaStructureLevel3)) AS name FROM bbva.Person WHERE NULLIF(LTRIM(RTRIM(BbvaStructureLevel3)),N'') IS NOT NULL ORDER BY name;`),
      pool.request().query(`SELECT DISTINCT LTRIM(RTRIM(DeliveryManager)) AS name FROM bbva.Collaborator WHERE Status=N'ACTIVE' AND NULLIF(LTRIM(RTRIM(DeliveryManager)),N'') IS NOT NULL ORDER BY name;`),
    ]);
    return {
      technologies: technologies.recordset as Array<{ id: string; name: string }>,
      profiles: profiles.recordset as Array<{ id: string; name: string }>,
      certifications: certifications.recordset as Array<{ id: string; name: string }>,
      technologyProfiles: (technologyProfiles.recordset as Array<{ name: string }>).map((item)=>item.name),
      bbvaStructures: (bbvaStructuresLevel2.recordset as Array<{ name: string }>).map((item)=>item.name),
      bbvaStructuresLevel2: (bbvaStructuresLevel2.recordset as Array<{ name: string }>).map((item)=>item.name),
      bbvaStructuresLevel3: (bbvaStructuresLevel3.recordset as Array<{ name: string }>).map((item)=>item.name),
      deliveryManagers: (deliveryManagers.recordset as Array<{ name: string }>).map((item) => item.name),
    };
  }
}
