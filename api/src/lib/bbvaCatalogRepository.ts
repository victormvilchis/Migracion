import sql from 'mssql';
import { getDbConnection } from './db.js';
import type {
  BbvaCatalogDefinition,
  BbvaCatalogInput,
  BbvaCatalogListParams,
  BbvaCatalogOption,
  BbvaCatalogPage,
  BbvaCatalogRecord,
  BbvaCatalogStatus,
} from './bbvaCatalogDomain.js';

const SORT_MAP = {
  name: 'c.Name',
  usageCount: 'UsageCount',
  updatedAt: 'c.UpdatedAt',
  status: 'c.Status',
} as const;

function usageExpression(definition: BbvaCatalogDefinition): string {
  const expressions: string[] = [];
  if (definition.usageColumn) {
    const byName = `UPPER(LTRIM(RTRIM(ISNULL(p.${definition.usageColumn}, N'')))) = UPPER(LTRIM(RTRIM(c.Name)))`;
    expressions.push(definition.usageIdColumn
      ? `(SELECT COUNT_BIG(1) FROM bbva.Person p WHERE p.${definition.usageIdColumn}=c.Id OR (p.${definition.usageIdColumn} IS NULL AND ${byName}))`
      : `(SELECT COUNT_BIG(1) FROM bbva.Person p WHERE ${byName})`);
  }
  expressions.push(...(definition.extraUsageExpressions ?? []));
  return expressions.length ? expressions.map((expression) => `(${expression})`).join(' + ') : 'CAST(0 AS INT)';
}

function selectColumns(definition: BbvaCatalogDefinition): string {
  return `
    CAST(c.Id AS NVARCHAR(36)) AS id,
    c.Name AS name,
    c.Description AS description,
    c.Seniority AS seniority,
    c.Status AS status,
    CAST(${usageExpression(definition)} AS INT) AS usageCount,
    CONVERT(VARCHAR(33), c.CreatedAt, 127) AS createdAt,
    CONVERT(VARCHAR(33), c.UpdatedAt, 127) AS updatedAt,
    c.CreatedByEmail AS createdByEmail,
    c.UpdatedByEmail AS updatedByEmail
  `;
}

export class BbvaCatalogRepository {
  async list(definition: BbvaCatalogDefinition, params: BbvaCatalogListParams): Promise<BbvaCatalogPage> {
    const pool = await getDbConnection();
    const page = Math.max(0, params.page ?? 0);
    const size = [10, 25, 50, 100].includes(params.size ?? 10) ? (params.size ?? 10) : 10;
    const search = (params.search ?? '').trim();
    const status = params.status ?? 'ACTIVE';
    const direction = params.direction === 'desc' ? 'DESC' : 'ASC';
    const sortColumn = SORT_MAP[params.sort ?? 'name'];
    const offset = page * size;

    const where: string[] = [];
    if (search) where.push(`(c.Name LIKE @search OR ISNULL(c.Description, N'') LIKE @search OR ISNULL(c.Seniority, N'') LIKE @search)`);
    if (status !== 'ALL') where.push('c.Status = @status');
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await pool.request()
      .input('search', sql.NVarChar(220), `%${search}%`)
      .input('status', sql.NVarChar(16), status === 'ALL' ? null : status)
      .query(`SELECT COUNT(1) AS total FROM ${definition.tableName} c ${whereSql};`);
    const total = Number(countResult.recordset[0]?.total ?? 0);

    const result = await pool.request()
      .input('search', sql.NVarChar(220), `%${search}%`)
      .input('status', sql.NVarChar(16), status === 'ALL' ? null : status)
      .input('offset', sql.Int, offset)
      .input('size', sql.Int, size)
      .query(`
        SELECT ${selectColumns(definition)}
        FROM ${definition.tableName} c
        ${whereSql}
        ORDER BY ${sortColumn} ${direction}, c.Id ASC
        OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
      `);

    return {
      items: result.recordset as BbvaCatalogRecord[],
      page,
      size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
    };
  }

  async listOptions(definition: BbvaCatalogDefinition): Promise<BbvaCatalogOption[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT CAST(Id AS NVARCHAR(36)) AS id, Name AS name, Seniority AS seniority
      FROM ${definition.tableName}
      WHERE Status=N'ACTIVE'
      ORDER BY Name ASC, Id ASC;
    `);
    return result.recordset as BbvaCatalogOption[];
  }

  async findById(definition: BbvaCatalogDefinition, id: string): Promise<BbvaCatalogRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`
      SELECT ${selectColumns(definition)}
      FROM ${definition.tableName} c
      WHERE c.Id=@id;
    `);
    return (result.recordset[0] as BbvaCatalogRecord | undefined) ?? null;
  }

  async findActiveOptionById(definition: BbvaCatalogDefinition, id: string): Promise<BbvaCatalogOption | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`
      SELECT CAST(Id AS NVARCHAR(36)) AS id, Name AS name, Seniority AS seniority
      FROM ${definition.tableName}
      WHERE Id=@id AND Status=N'ACTIVE';
    `);
    return (result.recordset[0] as BbvaCatalogOption | undefined) ?? null;
  }

  async findActiveOptionByName(definition: BbvaCatalogDefinition, name: string): Promise<BbvaCatalogOption | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('name', sql.NVarChar(180), name).query(`
      SELECT TOP 1 CAST(Id AS NVARCHAR(36)) AS id, Name AS name, Seniority AS seniority
      FROM ${definition.tableName}
      WHERE Status=N'ACTIVE' AND UPPER(LTRIM(RTRIM(Name)))=UPPER(LTRIM(RTRIM(@name)));
    `);
    return (result.recordset[0] as BbvaCatalogOption | undefined) ?? null;
  }

  async create(definition: BbvaCatalogDefinition, input: BbvaCatalogInput, actorEmail: string): Promise<BbvaCatalogRecord> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('name', sql.NVarChar(180), input.name)
      .input('description', sql.NVarChar(500), input.description || null)
      .input('seniority', sql.NVarChar(40), definition.supportsSeniority ? (input.seniority || null) : null)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`
        INSERT INTO ${definition.tableName} (Name, Description, Seniority, Status, CreatedByEmail, UpdatedByEmail)
        OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id
        VALUES (@name, @description, @seniority, N'ACTIVE', @actorEmail, @actorEmail);
      `);
    const id = String(result.recordset[0].id);
    const created = await this.findById(definition, id);
    if (!created) throw new Error(`No fue posible recuperar la ${definition.singularLabel} creada.`);
    return created;
  }

  async update(definition: BbvaCatalogDefinition, id: string, input: BbvaCatalogInput, actorEmail: string): Promise<BbvaCatalogRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar(180), input.name)
      .input('description', sql.NVarChar(500), input.description || null)
      .input('seniority', sql.NVarChar(40), definition.supportsSeniority ? (input.seniority || null) : null)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`
        UPDATE ${definition.tableName}
        SET Name=@name, Description=@description, Seniority=@seniority,
            UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail
        WHERE Id=@id;
        SELECT @@ROWCOUNT AS affected;
      `);
    if (Number(result.recordset[0]?.affected ?? 0) === 0) return null;
    return this.findById(definition, id);
  }

  async updateStatus(definition: BbvaCatalogDefinition, id: string, status: BbvaCatalogStatus, actorEmail: string): Promise<BbvaCatalogRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar(16), status)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`
        UPDATE ${definition.tableName}
        SET Status=@status, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail
        WHERE Id=@id;
        SELECT @@ROWCOUNT AS affected;
      `);
    if (Number(result.recordset[0]?.affected ?? 0) === 0) return null;
    return this.findById(definition, id);
  }

  async delete(definition: BbvaCatalogDefinition, id: string): Promise<boolean> {
    const current = await this.findById(definition, id);
    if (!current) return false;
    if (current.usageCount > 0) {
      const error = new Error(`${definition.singularArticle === 'la' ? 'La' : 'El'} ${definition.singularLabel} está vinculado a registros históricos y no puede eliminarse sin perder trazabilidad. Déjalo inactivo; ya no podrá seleccionarse en nuevas asignaciones.`) as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`DELETE FROM ${definition.tableName} WHERE Id=@id; SELECT @@ROWCOUNT AS affected;`);
    return Number(result.recordset[0]?.affected ?? 0) > 0;
  }
}
