import sql from 'mssql';
import { getDbConnection } from './db.js';
import type {
  CertificationCatalogInput,
  CertificationCatalogListItem,
  CertificationCatalogListParams,
  CertificationCatalogOption,
  CertificationCatalogPage,
  CertificationCatalogRecord,
  CertificationCatalogStatus,
  CertificationLevel,
  CertificationProfileRule,
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
  code: string;
  name: string;
  description: string | null;
  certificationType: CertificationCatalogRecord['certificationType'];
  provider: string | null;
  technologyId: string | null;
  technologyName: string | null;
  validityMonths: number | null;
  initialCompletionMonths: number | null;
  expiringSoonDays: number | null;
  firstAttemptCost: number | null;
  subsequentAttemptCost: number | null;
  costCurrency: string | null;
  includesTraining: boolean;
  recertificationEnabled: boolean;
  requiresAttempts: boolean;
  requiresApplicationDate: boolean;
  defaultMandatory: boolean;
  requirementGroup: string | null;
  requirementGroupMinimum: number | null;
  status: CertificationCatalogStatus;
  allowedLevelsCsv: string | null;
  profileCount: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}

const BASE_SELECT = `
  SELECT
    CAST(c.Id AS NVARCHAR(36)) AS id,
    c.Code AS code,
    c.Name AS name,
    c.Description AS description,
    c.CertificationType AS certificationType,
    c.Provider AS provider,
    CAST(c.TechnologyId AS NVARCHAR(36)) AS technologyId,
    t.Name AS technologyName,
    c.ValidityMonths AS validityMonths,
    c.InitialCompletionMonths AS initialCompletionMonths,
    c.ExpiringSoonDays AS expiringSoonDays,
    c.FirstAttemptCost AS firstAttemptCost,
    c.SubsequentAttemptCost AS subsequentAttemptCost,
    c.CostCurrency AS costCurrency,
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
    CAST((SELECT COUNT(1) FROM bbva.CertificationProfileRule r WHERE r.CertificationId=c.Id) AS INT) AS profileCount,
    CAST(0 AS INT) AS usageCount,
    CONVERT(VARCHAR(33), c.CreatedAt, 127) AS createdAt,
    CONVERT(VARCHAR(33), c.UpdatedAt, 127) AS updatedAt,
    c.CreatedByEmail AS createdByEmail,
    c.UpdatedByEmail AS updatedByEmail
  FROM bbva.CertificationCatalog c
  LEFT JOIN bbva.CatalogTechnology t ON t.Id=c.TechnologyId
`;

function toBaseRecord(row: BaseRow): Omit<CertificationCatalogRecord, 'profileRules'> {
  const allowedLevels = (row.allowedLevelsCsv ? row.allowedLevelsCsv.split(',') : []) as CertificationLevel[];
  return {
    ...row,
    allowedLevels,
    profileCount: Number(row.profileCount ?? 0),
    usageCount: Number(row.usageCount ?? 0),
    validityMonths: row.validityMonths === null ? null : Number(row.validityMonths),
    initialCompletionMonths: row.initialCompletionMonths === null ? null : Number(row.initialCompletionMonths),
    expiringSoonDays: row.expiringSoonDays === null ? null : Number(row.expiringSoonDays),
    firstAttemptCost: row.firstAttemptCost === null ? null : Number(row.firstAttemptCost),
    subsequentAttemptCost: row.subsequentAttemptCost === null ? null : Number(row.subsequentAttemptCost),
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
    if (search) where.push(`(c.Name LIKE @search OR c.Code LIKE @search OR ISNULL(c.Provider,N'') LIKE @search OR ISNULL(t.Name,N'') LIKE @search)`);
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
      items: (result.recordset as BaseRow[]).map((row) => ({ ...toBaseRecord(row), profileRules: [] } as CertificationCatalogListItem)),
      page,
      size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
    };
  }

  async options(): Promise<CertificationCatalogOption[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT CAST(c.Id AS NVARCHAR(36)) AS id, c.Code AS code, c.Name AS name,
             c.CertificationType AS certificationType,
             CAST(c.TechnologyId AS NVARCHAR(36)) AS technologyId, t.Name AS technologyName,
             c.ValidityMonths AS validityMonths, c.InitialCompletionMonths AS initialCompletionMonths, c.ExpiringSoonDays AS expiringSoonDays,
             c.RecertificationEnabled AS recertificationEnabled, c.DefaultMandatory AS defaultMandatory
      FROM bbva.CertificationCatalog c
      LEFT JOIN bbva.CatalogTechnology t ON t.Id=c.TechnologyId
      WHERE c.Status=N'ACTIVE'
      ORDER BY c.Name ASC;
    `);
    return result.recordset as CertificationCatalogOption[];
  }

  async findById(id: string): Promise<CertificationCatalogRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`${BASE_SELECT} WHERE c.Id=@id;`);
    const row = result.recordset[0] as BaseRow | undefined;
    if (!row) return null;

    const rulesResult = await pool.request().input('id', sql.UniqueIdentifier, id).query(`
      SELECT CAST(r.ProfileId AS NVARCHAR(36)) AS profileId, p.Name AS profileName, p.Seniority AS profileSeniority, r.IsMandatory AS mandatory
      FROM bbva.CertificationProfileRule r
      INNER JOIN bbva.CatalogProfile p ON p.Id=r.ProfileId
      WHERE r.CertificationId=@id
      ORDER BY p.Name ASC;
    `);

    return { ...toBaseRecord(row), profileRules: rulesResult.recordset as CertificationProfileRule[] };
  }

  async create(input: CertificationCatalogInput, actorEmail: string): Promise<CertificationCatalogRecord> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const id = crypto.randomUUID();
      await this.writeRecord(new sql.Request(transaction), id, input, actorEmail, true);
      await this.replaceLevels(transaction, id, input.allowedLevels);
      await this.replaceProfileRules(transaction, id, input.profileRules);
      await this.writeHistory(transaction, id, input.code, 'CREATED', 'La certificación fue creada.', actorEmail);
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
      await this.replaceProfileRules(transaction, id, input.profileRules);
      await this.writeHistory(transaction, id, input.code, 'UPDATED', 'La configuración de la certificación fue actualizada.', actorEmail);
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
      await this.writeHistory(transaction, id, current.code, status === 'ACTIVE' ? 'ACTIVATED' : 'INACTIVATED', status === 'ACTIVE' ? 'La certificación fue activada.' : 'La certificación fue inactivada.', actorEmail);
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
      const error = new Error('No es posible eliminar la certificación porque tiene historial operativo asociado. Puedes inactivarla para impedir nuevas asignaciones.') as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await this.writeHistory(transaction, id, current.code, 'DELETED', 'La certificación fue eliminada del catálogo.', actorEmail);
      await new sql.Request(transaction).input('id', sql.UniqueIdentifier, id).query(`DELETE FROM bbva.CertificationProfileRule WHERE CertificationId=@id; DELETE FROM bbva.CertificationAllowedLevel WHERE CertificationId=@id; DELETE FROM bbva.CertificationCatalog WHERE Id=@id;`);
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

  async activeProfilesExist(ids: string[]): Promise<boolean> {
    if (!ids.length) return true;
    const pool = await getDbConnection();
    const request = pool.request();
    const placeholders = ids.map((id, index) => {
      request.input(`profile${index}`, sql.UniqueIdentifier, id);
      return `@profile${index}`;
    });
    const result = await request.query(`SELECT COUNT(1) AS total FROM bbva.CatalogProfile WHERE Status=N'ACTIVE' AND Id IN (${placeholders.join(',')});`);
    return Number(result.recordset[0]?.total ?? 0) === new Set(ids).size;
  }

  private async writeRecord(request: sql.Request, id: string, input: CertificationCatalogInput, actorEmail: string, create: boolean): Promise<void> {
    request
      .input('id', sql.UniqueIdentifier, id)
      .input('code', sql.NVarChar(80), input.code)
      .input('name', sql.NVarChar(180), input.name)
      .input('description', sql.NVarChar(1000), input.description)
      .input('certificationType', sql.NVarChar(40), input.certificationType)
      .input('provider', sql.NVarChar(120), input.provider)
      .input('technologyId', sql.UniqueIdentifier, input.technologyId)
      .input('validityMonths', sql.Int, input.validityMonths)
      .input('initialCompletionMonths', sql.Int, input.initialCompletionMonths)
      .input('expiringSoonDays', sql.Int, input.expiringSoonDays)
      .input('firstAttemptCost', sql.Decimal(12, 2), input.firstAttemptCost)
      .input('subsequentAttemptCost', sql.Decimal(12, 2), input.subsequentAttemptCost)
      .input('costCurrency', sql.NVarChar(8), input.costCurrency)
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
          Id,Code,Name,Description,CertificationType,Provider,TechnologyId,ValidityMonths,InitialCompletionMonths,ExpiringSoonDays,FirstAttemptCost,SubsequentAttemptCost,CostCurrency,IncludesTraining,
          RecertificationEnabled,RequiresAttempts,RequiresApplicationDate,DefaultMandatory,RequirementGroup,RequirementGroupMinimum,
          Status,CreatedByEmail,UpdatedByEmail
        ) VALUES (
          @id,@code,@name,@description,@certificationType,@provider,@technologyId,@validityMonths,@initialCompletionMonths,@expiringSoonDays,@firstAttemptCost,@subsequentAttemptCost,@costCurrency,@includesTraining,
          @recertificationEnabled,@requiresAttempts,@requiresApplicationDate,@defaultMandatory,@requirementGroup,@requirementGroupMinimum,
          N'ACTIVE',@actorEmail,@actorEmail
        );
      `);
    } else {
      await request.query(`
        UPDATE bbva.CertificationCatalog SET
          Code=@code,Name=@name,Description=@description,CertificationType=@certificationType,Provider=@provider,TechnologyId=@technologyId,
          ValidityMonths=@validityMonths,InitialCompletionMonths=@initialCompletionMonths,ExpiringSoonDays=@expiringSoonDays,
          FirstAttemptCost=@firstAttemptCost,SubsequentAttemptCost=@subsequentAttemptCost,CostCurrency=@costCurrency,IncludesTraining=@includesTraining,RecertificationEnabled=@recertificationEnabled,
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

  private async replaceProfileRules(transaction: sql.Transaction, id: string, rules: CertificationCatalogInput['profileRules']): Promise<void> {
    await new sql.Request(transaction).input('id', sql.UniqueIdentifier, id).query(`DELETE FROM bbva.CertificationProfileRule WHERE CertificationId=@id;`);
    for (const rule of rules) {
      await new sql.Request(transaction)
        .input('certificationId', sql.UniqueIdentifier, id)
        .input('profileId', sql.UniqueIdentifier, rule.profileId)
        .input('mandatory', sql.Bit, rule.mandatory)
        .query(`INSERT INTO bbva.CertificationProfileRule (CertificationId,ProfileId,IsMandatory) VALUES (@certificationId,@profileId,@mandatory);`);
    }
  }
  private async writeHistory(
    transaction: sql.Transaction,
    certificationId: string,
    code: string,
    eventType: string,
    description: string,
    actorEmail: string,
  ): Promise<void> {
    await new sql.Request(transaction)
      .input('certificationId', sql.UniqueIdentifier, certificationId)
      .input('code', sql.NVarChar(80), code)
      .input('eventType', sql.NVarChar(40), eventType)
      .input('description', sql.NVarChar(500), description)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`INSERT INTO bbva.CertificationCatalogHistory (CertificationId,CertificationCode,EventType,Description,CreatedByEmail) VALUES (@certificationId,@code,@eventType,@description,@actorEmail);`);
  }

}
