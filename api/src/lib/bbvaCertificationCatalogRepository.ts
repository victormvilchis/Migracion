import sql from 'mssql';
import { getDbConnection } from './db.js';
import type {
  CertificationCatalogInput,
  CertificationCatalogListParams,
  CertificationCatalogOption,
  CertificationCatalogPage,
  CertificationCatalogRecord,
  CertificationCatalogStatus,
  CertificationLevel,
} from './bbvaCertificationCatalogDomain.js';

const SORT_MAP = {
  name: 'c.Name',
  certificationType: 'c.CertificationType',
  provider: 'c.Provider',
  validityMonths: 'c.ValidityMonths',
  updatedAt: 'c.UpdatedAt',
  status: 'c.Status',
} as const;

interface BaseRow {
  id: string;
  name: string;
  description: string | null;
  certificationType: CertificationCatalogRecord['certificationType'];
  provider: string | null;
  technologyId: string | null;
  technologyName: string | null;
  validityMonths: number | null;
  initialCompletionDays: number | null;
  expiringSoonDays: number | null;
  maxAttempts: number | null;
  includesTraining: boolean;
  recertificationEnabled: boolean;
  requiresAttempts: boolean;
  requiresApplicationDate: boolean;
  defaultMandatory: boolean;
  requirementGroup: string | null;
  requirementGroupMinimum: number | null;
  status: CertificationCatalogStatus;
  allowedLevelsCsv: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

const BASE_SELECT = `
  SELECT
    CAST(c.Id AS NVARCHAR(36)) AS id,
    c.Name AS name,
    c.Description AS description,
    c.CertificationType AS certificationType,
    c.Provider AS provider,
    CAST(c.TechnologyId AS NVARCHAR(36)) AS technologyId,
    t.Name AS technologyName,
    c.ValidityMonths AS validityMonths,
    c.InitialCompletionDays AS initialCompletionDays,
    c.ExpiringSoonDays AS expiringSoonDays,
    c.MaxAttempts AS maxAttempts,
    c.IncludesTraining AS includesTraining,
    c.RecertificationEnabled AS recertificationEnabled,
    c.RequiresAttempts AS requiresAttempts,
    c.RequiresApplicationDate AS requiresApplicationDate,
    c.DefaultMandatory AS defaultMandatory,
    c.RequirementGroup AS requirementGroup,
    c.RequirementGroupMinimum AS requirementGroupMinimum,
    c.Status AS status,
    (SELECT STRING_AGG(l.LevelCode, N',') WITHIN GROUP (ORDER BY l.LevelCode)
      FROM bbva.CertificationAllowedLevel l WHERE l.CertificationId=c.Id) AS allowedLevelsCsv,
    (SELECT COUNT(1) FROM bbva.PersonCertification pc WHERE pc.CertificationId=c.Id) AS usageCount,
    CONVERT(VARCHAR(33), c.CreatedAt, 127) AS createdAt,
    CONVERT(VARCHAR(33), c.UpdatedAt, 127) AS updatedAt,
    c.CreatedByEmail AS createdByEmail,
    c.UpdatedByEmail AS updatedByEmail
  FROM bbva.CertificationCatalog c
  LEFT JOIN bbva.CatalogTechnology t ON t.Id=c.TechnologyId
`;

function toBaseRecord(row: BaseRow): CertificationCatalogRecord {
  const allowedLevels = (row.allowedLevelsCsv ? row.allowedLevelsCsv.split(',') : []) as CertificationLevel[];
  return {
    ...row,
    allowedLevels,
    usageCount: Number(row.usageCount ?? 0),
    validityMonths: row.validityMonths === null ? null : Number(row.validityMonths),
    initialCompletionDays: row.initialCompletionDays === null ? null : Number(row.initialCompletionDays),
    expiringSoonDays: row.expiringSoonDays === null ? null : Number(row.expiringSoonDays),
    maxAttempts: row.maxAttempts === null ? null : Number(row.maxAttempts),
    requirementGroupMinimum: row.requirementGroupMinimum === null ? null : Number(row.requirementGroupMinimum),
  };
}

export class BbvaCertificationCatalogRepository {
  async list(params: CertificationCatalogListParams): Promise<CertificationCatalogPage> {
    const pool = await getDbConnection();
    const page = Math.max(0, params.page ?? 0);
    const size = [10, 25, 50, 100].includes(params.size ?? 10) ? (params.size ?? 10) : 10;
    const offset = page * size;
    const search = (params.search ?? '').trim();
    const status = params.status ?? 'ACTIVE';
    const certificationType = params.certificationType ?? 'ALL';
    const sort = SORT_MAP[params.sort ?? 'name'];
    const direction = params.direction === 'desc' ? 'DESC' : 'ASC';

    const where: string[] = [];
    if (search) where.push(`(c.Name LIKE @search OR ISNULL(c.Provider,N'') LIKE @search OR ISNULL(t.Name,N'') LIKE @search OR ISNULL(c.Description,N'') LIKE @search)`);
    if (status !== 'ALL') where.push('c.Status=@status');
    if (certificationType !== 'ALL') where.push('c.CertificationType=@certificationType');
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const count = await pool.request()
      .input('search', sql.NVarChar(220), `%${search}%`)
      .input('status', sql.NVarChar(16), status === 'ALL' ? null : status)
      .input('certificationType', sql.NVarChar(40), certificationType === 'ALL' ? null : certificationType)
      .query(`SELECT COUNT(1) AS total FROM bbva.CertificationCatalog c LEFT JOIN bbva.CatalogTechnology t ON t.Id=c.TechnologyId ${whereSql};`);
    const total = Number(count.recordset[0]?.total ?? 0);

    const result = await pool.request()
      .input('search', sql.NVarChar(220), `%${search}%`)
      .input('status', sql.NVarChar(16), status === 'ALL' ? null : status)
      .input('certificationType', sql.NVarChar(40), certificationType === 'ALL' ? null : certificationType)
      .input('offset', sql.Int, offset)
      .input('size', sql.Int, size)
      .query(`${BASE_SELECT} ${whereSql} ORDER BY ${sort} ${direction}, c.Id ASC OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;`);

    return {
      items: (result.recordset as BaseRow[]).map(toBaseRecord),
      page,
      size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
    };
  }

  async options(): Promise<CertificationCatalogOption[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT CAST(c.Id AS NVARCHAR(36)) AS id, c.Name AS name,
             c.CertificationType AS certificationType,
             CAST(c.TechnologyId AS NVARCHAR(36)) AS technologyId, t.Name AS technologyName,
             c.ValidityMonths AS validityMonths, c.InitialCompletionDays AS initialCompletionDays, c.ExpiringSoonDays AS expiringSoonDays,
             c.RecertificationEnabled AS recertificationEnabled, c.DefaultMandatory AS defaultMandatory,
             (SELECT STRING_AGG(l.LevelCode,N',') WITHIN GROUP (ORDER BY l.LevelCode) FROM bbva.CertificationAllowedLevel l WHERE l.CertificationId=c.Id) AS allowedLevelsCsv
      FROM bbva.CertificationCatalog c
      LEFT JOIN bbva.CatalogTechnology t ON t.Id=c.TechnologyId
      WHERE c.Status=N'ACTIVE'
      ORDER BY c.Name ASC;
    `);
    return result.recordset.map((row:any) => ({ ...row, allowedLevels: row.allowedLevelsCsv ? String(row.allowedLevelsCsv).split(',') : [] })) as CertificationCatalogOption[];
  }

  async findById(id: string): Promise<CertificationCatalogRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`${BASE_SELECT} WHERE c.Id=@id;`);
    const row = result.recordset[0] as BaseRow | undefined;
    return row ? toBaseRecord(row) : null;
  }

  async create(input: CertificationCatalogInput, actorEmail: string): Promise<CertificationCatalogRecord> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const id = crypto.randomUUID();
      await this.writeRecord(new sql.Request(transaction), id, input, actorEmail, true);
      await this.replaceLevels(transaction, id, input.allowedLevels);
      await this.writeHistory(transaction, id, 'CREATED', 'La certificación fue creada.', actorEmail);
      await transaction.commit();
      const created = await this.findById(id);
      if (!created) throw new Error('No fue posible recuperar la certificación creada.');
      return created;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(id: string, input: CertificationCatalogInput, actorEmail: string): Promise<CertificationCatalogRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await this.writeRecord(new sql.Request(transaction), id, input, actorEmail, false);
      await this.replaceLevels(transaction, id, input.allowedLevels);
      await this.writeHistory(transaction, id, 'UPDATED', 'La configuración de la certificación fue actualizada.', actorEmail);
      await transaction.commit();
      return this.findById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateStatus(id: string, status: CertificationCatalogStatus, actorEmail: string): Promise<CertificationCatalogRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .input('status', sql.NVarChar(16), status)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`UPDATE bbva.CertificationCatalog SET Status=@status, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail WHERE Id=@id;`);
      await this.writeHistory(transaction, id, status === 'ACTIVE' ? 'ACTIVATED' : 'INACTIVATED', status === 'ACTIVE' ? 'La certificación fue activada.' : 'La certificación fue inactivada.', actorEmail);
      await transaction.commit();
      return this.findById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async delete(id: string, actorEmail: string): Promise<boolean> {
    const current = await this.findById(id);
    if (!current) return false;
    if (current.usageCount > 0) {
      const error = new Error('Esta certificación está vinculada a expedientes históricos y no puede eliminarse sin perder trazabilidad. Déjala inactiva; ya no podrá asignarse ni modificarse.') as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await this.writeHistory(transaction, id, 'DELETED', 'La certificación fue eliminada del catálogo.', actorEmail);
      await new sql.Request(transaction).input('id', sql.UniqueIdentifier, id).query(`DELETE FROM bbva.CertificationAllowedLevel WHERE CertificationId=@id; DELETE FROM bbva.CertificationCatalog WHERE Id=@id;`);
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async activeTechnologyExists(id: string): Promise<boolean> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`SELECT TOP 1 1 AS ok FROM bbva.CatalogTechnology WHERE Id=@id AND Status=N'ACTIVE';`);
    return Boolean(result.recordset[0]?.ok);
  }

  private async writeRecord(request: sql.Request, id: string, input: CertificationCatalogInput, actorEmail: string, create: boolean): Promise<void> {
    request
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar(180), input.name)
      .input('description', sql.NVarChar(1000), input.description)
      .input('certificationType', sql.NVarChar(40), input.certificationType)
      .input('provider', sql.NVarChar(120), input.provider)
      .input('technologyId', sql.UniqueIdentifier, input.technologyId)
      .input('validityMonths', sql.Int, input.validityMonths)
      .input('initialCompletionDays', sql.Int, input.initialCompletionDays)
      .input('expiringSoonDays', sql.Int, input.expiringSoonDays)
      .input('maxAttempts', sql.Int, input.maxAttempts)
                        .input('includesTraining', sql.Bit, input.includesTraining)
      .input('recertificationEnabled', sql.Bit, input.recertificationEnabled)
      .input('requiresAttempts', sql.Bit, input.requiresAttempts)
      .input('requiresApplicationDate', sql.Bit, input.requiresApplicationDate)
      .input('defaultMandatory', sql.Bit, input.defaultMandatory)
      .input('requirementGroup', sql.NVarChar(80), input.requirementGroup)
      .input('requirementGroupMinimum', sql.Int, input.requirementGroupMinimum)
      .input('actorEmail', sql.NVarChar(255), actorEmail);

    if (create) {
      await request.query(`
        INSERT INTO bbva.CertificationCatalog (
          Id,Name,Description,CertificationType,Provider,TechnologyId,ValidityMonths,InitialCompletionDays,ExpiringSoonDays,MaxAttempts,IncludesTraining,
          RecertificationEnabled,RequiresAttempts,RequiresApplicationDate,DefaultMandatory,RequirementGroup,RequirementGroupMinimum,
          Status,CreatedByEmail,UpdatedByEmail
        ) VALUES (
          @id,@name,@description,@certificationType,@provider,@technologyId,@validityMonths,@initialCompletionDays,@expiringSoonDays,@maxAttempts,@includesTraining,
          @recertificationEnabled,@requiresAttempts,@requiresApplicationDate,@defaultMandatory,@requirementGroup,@requirementGroupMinimum,
          N'ACTIVE',@actorEmail,@actorEmail
        );
      `);
    } else {
      await request.query(`
        UPDATE bbva.CertificationCatalog SET
          Name=@name,Description=@description,CertificationType=@certificationType,Provider=@provider,TechnologyId=@technologyId,
          ValidityMonths=@validityMonths,InitialCompletionDays=@initialCompletionDays,ExpiringSoonDays=@expiringSoonDays,MaxAttempts=@maxAttempts,
          IncludesTraining=@includesTraining,RecertificationEnabled=@recertificationEnabled,
          RequiresAttempts=@requiresAttempts,RequiresApplicationDate=@requiresApplicationDate,DefaultMandatory=@defaultMandatory,
          RequirementGroup=@requirementGroup,RequirementGroupMinimum=@requirementGroupMinimum,
          UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
        WHERE Id=@id;
      `);
    }
  }

  private async replaceLevels(transaction: sql.Transaction, id: string, levels: CertificationLevel[]): Promise<void> {
    await new sql.Request(transaction).input('id', sql.UniqueIdentifier, id).query(`DELETE FROM bbva.CertificationAllowedLevel WHERE CertificationId=@id;`);
    for (const level of levels) {
      await new sql.Request(transaction)
        .input('certificationId', sql.UniqueIdentifier, id)
        .input('level', sql.NVarChar(16), level)
        .query(`INSERT INTO bbva.CertificationAllowedLevel (CertificationId,LevelCode) VALUES (@certificationId,@level);`);
    }
  }

  private async writeHistory(
    transaction: sql.Transaction,
    certificationId: string,
    eventType: string,
    description: string,
    actorEmail: string,
  ): Promise<void> {
    await new sql.Request(transaction)
      .input('certificationId', sql.UniqueIdentifier, certificationId)
      .input('eventType', sql.NVarChar(40), eventType)
      .input('description', sql.NVarChar(500), description)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`INSERT INTO bbva.CertificationCatalogHistory (CertificationId,EventType,Description,CreatedByEmail) VALUES (@certificationId,@eventType,@description,@actorEmail);`);
  }
}
