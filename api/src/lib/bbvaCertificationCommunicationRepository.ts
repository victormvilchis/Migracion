import crypto from 'node:crypto';
import sql from 'mssql';
import { getDbConnection } from './db.js';
import type {
  CertificationCommunicationContext,
  CertificationCommunicationSource,
  CertificationEmailTemplateRecord,
  CertificationPostcardTemplateRecord,
} from './bbvaCertificationCommunicationDomain.js';

export interface StoredCertificationCommunication {
  id: string;
  certificationRecordId: string;
  attemptId: string | null;
  cycleNumber: number;
  context: CertificationCommunicationContext;
  postcardTemplateId: string;
  postcardTemplateVersion: number;
  pngData: Buffer;
  recipientEmail: string | null;
  emailStatus: 'NOT_PREPARED' | 'PREPARED' | 'SENT' | 'FAILED';
  emailTemplateId: string | null;
  emailTemplateVersion: number | null;
  emailSubject: string | null;
  emailBody: string | null;
  generatedAt: string;
}

function stored(row: any): StoredCertificationCommunication {
  return {
    id: String(row.id),
    certificationRecordId: String(row.certificationRecordId),
    attemptId: row.attemptId ? String(row.attemptId) : null,
    cycleNumber: Number(row.cycleNumber),
    context: row.context,
    postcardTemplateId: String(row.postcardTemplateId),
    postcardTemplateVersion: Number(row.postcardTemplateVersion),
    pngData: Buffer.isBuffer(row.pngData) ? row.pngData : Buffer.from(row.pngData ?? []),
    recipientEmail: row.recipientEmail ?? null,
    emailStatus: row.emailStatus,
    emailTemplateId: row.emailTemplateId ? String(row.emailTemplateId) : null,
    emailTemplateVersion: row.emailTemplateVersion === null ? null : Number(row.emailTemplateVersion),
    emailSubject: row.emailSubject ?? null,
    emailBody: row.emailBody ?? null,
    generatedAt: String(row.generatedAt),
  };
}

const COMMUNICATION_SELECT = `
  SELECT CAST(c.Id AS NVARCHAR(36)) AS id,
         CAST(c.PersonCertificationId AS NVARCHAR(36)) AS certificationRecordId,
         CAST(c.AttemptId AS NVARCHAR(36)) AS attemptId,
         c.CycleNumber AS cycleNumber,c.Context AS context,
         CAST(c.PostcardTemplateId AS NVARCHAR(36)) AS postcardTemplateId,
         c.PostcardTemplateVersion AS postcardTemplateVersion,c.PngData AS pngData,
         c.RecipientEmail AS recipientEmail,c.EmailStatus AS emailStatus,
         CAST(c.EmailTemplateId AS NVARCHAR(36)) AS emailTemplateId,
         c.EmailTemplateVersion AS emailTemplateVersion,c.EmailSubject AS emailSubject,c.EmailBody AS emailBody,
         CONVERT(VARCHAR(33),c.GeneratedAt,127) AS generatedAt
  FROM bbva.CertificationCommunication c
`;

export class CertificationCommunicationRepository {
  async source(collaboratorId: string, recordId: string, attemptId: string): Promise<CertificationCommunicationSource | null> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
      .input('recordId', sql.UniqueIdentifier, recordId)
      .input('attemptId', sql.UniqueIdentifier, attemptId)
      .query(`
        SELECT CAST(c.Id AS NVARCHAR(36)) AS collaboratorId,
               CAST(pc.Id AS NVARCHAR(36)) AS certificationRecordId,
               CAST(cc.Id AS NVARCHAR(36)) AS certificationId,
               cc.Name AS certificationName,cc.CertificationType AS certificationType,t.Name AS technologyName,
               LTRIM(RTRIM(CONCAT(ISNULL(p.FirstName,N''),N' ',ISNULL(p.LastName,N'')))) AS fullName,
               ISNULL(p.FirstName,N'') AS firstName,
               NULLIF(LTRIM(RTRIM(p.SofttekEmail)),N'') AS recipientEmail,
               a.CycleNumber AS currentCycle,cc.MaxAttempts AS maxAttempts,pc.BaseStatus AS baseStatus,
               CAST(a.Id AS NVARCHAR(36)) AS attemptId,a.AttemptNumber AS attemptNumber,
               CONVERT(VARCHAR(10),a.ApplicationDate,23) AS attemptDate,a.Result AS result,a.Score10 AS score10
        FROM bbva.PersonCertification pc
        INNER JOIN bbva.CertificationCatalog cc ON cc.Id=pc.CertificationId
        INNER JOIN bbva.Collaborator c ON c.PersonId=pc.PersonId
        INNER JOIN bbva.Person p ON p.Id=pc.PersonId
        INNER JOIN bbva.PersonCertificationAttempt a ON a.PersonCertificationId=pc.Id
        LEFT JOIN bbva.CatalogTechnology t ON t.Id=cc.TechnologyId
        WHERE c.Id=@collaboratorId AND pc.Id=@recordId AND a.Id=@attemptId;
      `);
    const row = result.recordset[0] as any;
    if (!row) return null;
    return {
      ...row,
      fullName: String(row.fullName || '').trim() || 'Colaborador',
      firstName: String(row.firstName || '').trim(),
      currentCycle: Number(row.currentCycle),
      maxAttempts: row.maxAttempts === null ? null : Number(row.maxAttempts),
      attemptNumber: Number(row.attemptNumber),
      score10: row.score10 === null ? null : Number(row.score10),
    } as CertificationCommunicationSource;
  }


  async automaticCc(collaboratorId: string, actorEmail: string): Promise<string[]> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`
        SELECT DISTINCT LTRIM(RTRIM(src.Email)) AS email
        FROM (
          SELECT NULLIF(LTRIM(RTRIM(@actorEmail)),N'') AS Email
          UNION ALL
          SELECT NULLIF(LTRIM(RTRIM(u.Email)),N'')
          FROM bbva.Collaborator c
          INNER JOIN bbva.SystemUser u
            ON u.Status=N'ACTIVE'
           AND UPPER(LTRIM(RTRIM(u.FullName)))=UPPER(LTRIM(RTRIM(ISNULL(c.DeliveryManager,N''))))
          WHERE c.Id=@collaboratorId
            AND EXISTS (
              SELECT 1 FROM bbva.SystemUserRole ur
              INNER JOIN bbva.SystemRole r ON r.Id=ur.RoleId
              WHERE ur.UserId=u.Id AND r.Status=N'ACTIVE' AND r.IsDeliveryManager=1
            )
          UNION ALL
          SELECT NULLIF(LTRIM(RTRIM(u.Email)),N'')
          FROM bbva.SystemUser u
          WHERE u.Status=N'ACTIVE'
            AND EXISTS (
              SELECT 1 FROM bbva.SystemUserRole ur
              INNER JOIN bbva.SystemRole r ON r.Id=ur.RoleId
              WHERE ur.UserId=u.Id AND r.Status=N'ACTIVE' AND r.Code=N'ADMINISTRATOR'
            )
        ) src
        WHERE src.Email IS NOT NULL;
      `);
    return (result.recordset as Array<{ email: string }>).map((row) => String(row.email).trim()).filter(Boolean);
  }

  async postcardTemplate(certificationId: string, context: CertificationCommunicationContext): Promise<CertificationPostcardTemplateRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('certificationId', sql.UniqueIdentifier, certificationId)
      .input('context', sql.NVarChar(32), context)
      .query(`
        SELECT TOP 1 CAST(t.Id AS NVARCHAR(36)) AS id,CAST(t.CertificationId AS NVARCHAR(36)) AS certificationId,
               t.Context AS context,t.Version AS version,t.Name AS name,t.EyebrowTemplate AS eyebrowTemplate,
               t.TitleTemplate AS titleTemplate,t.MessageTemplate AS messageTemplate,t.Accent AS accent
        FROM bbva.CertificationPostcardTemplate t
        WHERE t.Active=1
          AND (
            (t.CertificationId=@certificationId AND t.Context=@context)
            OR (t.CertificationId IS NULL AND t.Context=@context)
            OR (t.CertificationId IS NULL AND t.Context=N'DEFAULT')
          )
        ORDER BY CASE
                   WHEN t.CertificationId=@certificationId AND t.Context=@context THEN 0
                   WHEN t.CertificationId IS NULL AND t.Context=@context THEN 1
                   ELSE 2
                 END,
                 t.Version DESC;
      `);
    const row = result.recordset[0] as any;
    if (!row) return null;
    return { ...row, version: Number(row.version) } as CertificationPostcardTemplateRecord;
  }

  async emailTemplate(certificationId: string, context: CertificationCommunicationContext): Promise<CertificationEmailTemplateRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('certificationId', sql.UniqueIdentifier, certificationId)
      .input('context', sql.NVarChar(32), context)
      .query(`
        SELECT TOP 1 CAST(t.Id AS NVARCHAR(36)) AS id,CAST(t.CertificationId AS NVARCHAR(36)) AS certificationId,
               t.Context AS context,t.Version AS version,t.SubjectTemplate AS subjectTemplate,t.BodyTemplate AS bodyTemplate
        FROM bbva.CertificationEmailTemplate t
        WHERE t.Active=1
          AND (
            (t.CertificationId=@certificationId AND t.Context=@context)
            OR (t.CertificationId IS NULL AND t.Context=@context)
            OR (t.CertificationId IS NULL AND t.Context=N'DEFAULT')
          )
        ORDER BY CASE
                   WHEN t.CertificationId=@certificationId AND t.Context=@context THEN 0
                   WHEN t.CertificationId IS NULL AND t.Context=@context THEN 1
                   ELSE 2
                 END,
                 t.Version DESC;
      `);
    const row = result.recordset[0] as any;
    if (!row) return null;
    return { ...row, version: Number(row.version) } as CertificationEmailTemplateRecord;
  }

  async findByIdempotencyKey(key: string): Promise<StoredCertificationCommunication | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('key', sql.NVarChar(200), key).query(`${COMMUNICATION_SELECT} WHERE c.IdempotencyKey=@key;`);
    return result.recordset[0] ? stored(result.recordset[0]) : null;
  }

  async findById(recordId: string, communicationId: string): Promise<StoredCertificationCommunication | null> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('recordId', sql.UniqueIdentifier, recordId)
      .input('communicationId', sql.UniqueIdentifier, communicationId)
      .query(`${COMMUNICATION_SELECT} WHERE c.PersonCertificationId=@recordId AND c.Id=@communicationId;`);
    return result.recordset[0] ? stored(result.recordset[0]) : null;
  }

  async create(args: {
    recordId: string;
    attemptId: string;
    cycleNumber: number;
    context: CertificationCommunicationContext;
    template: CertificationPostcardTemplateRecord;
    pngData: Buffer;
    recipientEmail: string | null;
    idempotencyKey: string;
    actorEmail: string;
  }): Promise<StoredCertificationCommunication> {
    const pool = await getDbConnection();
    const id = crypto.randomUUID();
    try {
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('recordId', sql.UniqueIdentifier, args.recordId)
        .input('attemptId', sql.UniqueIdentifier, args.attemptId)
        .input('cycleNumber', sql.Int, args.cycleNumber)
        .input('context', sql.NVarChar(32), args.context)
        .input('templateId', sql.UniqueIdentifier, args.template.id)
        .input('templateVersion', sql.Int, args.template.version)
        .input('pngData', sql.VarBinary(sql.MAX), args.pngData)
        .input('recipientEmail', sql.NVarChar(255), args.recipientEmail)
        .input('idempotencyKey', sql.NVarChar(200), args.idempotencyKey)
        .input('actorEmail', sql.NVarChar(255), args.actorEmail)
        .query(`
          INSERT INTO bbva.CertificationCommunication(
            Id,PersonCertificationId,AttemptId,CycleNumber,Context,PostcardTemplateId,PostcardTemplateVersion,
            PngData,RecipientEmail,EmailStatus,IdempotencyKey,GeneratedByEmail
          ) VALUES(
            @id,@recordId,@attemptId,@cycleNumber,@context,@templateId,@templateVersion,
            @pngData,@recipientEmail,N'NOT_PREPARED',@idempotencyKey,@actorEmail
          );
        `);
    } catch (error) {
      const existing = await this.findByIdempotencyKey(args.idempotencyKey);
      if (existing) return existing;
      throw error;
    }
    const created = await this.findById(args.recordId, id);
    if (!created) throw new Error('No fue posible recuperar la comunicación generada.');
    return created;
  }

  async prepareEmail(args: {
    recordId: string;
    communicationId: string;
    template: CertificationEmailTemplateRecord;
    recipientEmail: string | null;
    subject: string;
    body: string;
  }): Promise<StoredCertificationCommunication | null> {
    const pool = await getDbConnection();
    await pool.request()
      .input('recordId', sql.UniqueIdentifier, args.recordId)
      .input('communicationId', sql.UniqueIdentifier, args.communicationId)
      .input('templateId', sql.UniqueIdentifier, args.template.id)
      .input('templateVersion', sql.Int, args.template.version)
      .input('recipientEmail', sql.NVarChar(255), args.recipientEmail)
      .input('subject', sql.NVarChar(300), args.subject)
      .input('body', sql.NVarChar(sql.MAX), args.body)
      .query(`
        UPDATE bbva.CertificationCommunication
        SET RecipientEmail=@recipientEmail,EmailStatus=N'PREPARED',EmailTemplateId=@templateId,
            EmailTemplateVersion=@templateVersion,EmailSubject=@subject,EmailBody=@body,UpdatedAt=SYSUTCDATETIME()
        WHERE PersonCertificationId=@recordId AND Id=@communicationId;
      `);
    return this.findById(args.recordId, args.communicationId);
  }
}
