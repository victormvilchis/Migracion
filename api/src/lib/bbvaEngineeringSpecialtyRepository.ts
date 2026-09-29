import sql from 'mssql';
import { getDbConnection } from './db.js';
import type {
  EngineeringExplorerSource,
  EngineeringSpecialtyInput,
  EngineeringSpecialtyPage,
  EngineeringSpecialtyRecord,
  EngineeringSpecialtyStatus,
} from './bbvaEngineeringSpecialtyDomain.js';

const cols = `CAST(Id AS NVARCHAR(36)) id,N3 n3,Guild guild,Specialty specialty,GuildLeader guildLeader,SpecialtyOwner specialtyOwner,PortfolioStaffing portfolioStaffing,Staffer staffer,Status status,CONVERT(VARCHAR(33),CreatedAt,127) createdAt,CONVERT(VARCHAR(33),UpdatedAt,127) updatedAt,CreatedByEmail createdByEmail,UpdatedByEmail updatedByEmail`;

export class BbvaEngineeringSpecialtyRepository {
  async list(search = '', status: EngineeringSpecialtyStatus | 'ALL' = 'ACTIVE', page = 0, size = 10): Promise<EngineeringSpecialtyPage> {
    const pool = await getDbConnection();
    const safePage = Math.max(0, page);
    const safeSize = [10, 25, 50, 100].includes(size) ? size : 10;
    const where = `Status<>N'DELETED' AND (@status IS NULL OR Status=@status) AND (@search=N'%%' OR N3 LIKE @search OR Guild LIKE @search OR Specialty LIKE @search OR ISNULL(Staffer,N'') LIKE @search OR ISNULL(GuildLeader,N'') LIKE @search OR ISNULL(SpecialtyOwner,N'') LIKE @search)`;
    const [items, total] = await Promise.all([
      pool.request().input('search', sql.NVarChar(220), `%${search.trim()}%`).input('status', sql.NVarChar(16), status === 'ALL' ? null : status).input('offset', sql.Int, safePage * safeSize).input('size', sql.Int, safeSize)
        .query(`SELECT ${cols} FROM bbva.EngineeringSpecialtyCatalog WHERE ${where} ORDER BY N3,Guild,Specialty OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;`),
      pool.request().input('search', sql.NVarChar(220), `%${search.trim()}%`).input('status', sql.NVarChar(16), status === 'ALL' ? null : status)
        .query(`SELECT COUNT(1) total FROM bbva.EngineeringSpecialtyCatalog WHERE ${where};`),
    ]);
    const count = Number(total.recordset[0]?.total ?? 0);
    return { items: items.recordset as EngineeringSpecialtyRecord[], page: safePage, size: safeSize, total: count, totalPages: Math.max(1, Math.ceil(count / safeSize)) };
  }

  async get(id: string) {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`SELECT ${cols} FROM bbva.EngineeringSpecialtyCatalog WHERE Id=@id AND Status<>N'DELETED';`);
    return (result.recordset[0] as EngineeringSpecialtyRecord | undefined) ?? null;
  }

  async explorerSource(): Promise<EngineeringExplorerSource> {
    const pool = await getDbConnection();
    const [structures, specialties, collaborators] = await Promise.all([
      pool.request().query(`
        SELECT CAST(s.Id AS NVARCHAR(36)) AS id,CAST(s.LevelCode AS INT) AS level,CAST(s.ParentId AS NVARCHAR(36)) AS parentId,
               parent.Name AS parentName,s.Name AS name,s.Description AS description,s.Status AS status
        FROM bbva.StructureCatalog s
        LEFT JOIN bbva.StructureCatalog parent ON parent.Id=s.ParentId
        ORDER BY s.LevelCode,s.Name;`),
      pool.request().query(`SELECT ${cols} FROM bbva.EngineeringSpecialtyCatalog WHERE Status<>N'DELETED' ORDER BY N3,Guild,Specialty;`),
      pool.request().query(`
        SELECT CAST(p.Id AS NVARCHAR(36)) AS id,
               UPPER(LTRIM(RTRIM(CONCAT(p.FirstName,N' ',ISNULL(p.LastName,N''))))) AS fullName,
               p.Profile AS profile,p.CurrentTechnology AS technology,c.DeliveryManager AS deliveryManager,
               p.BbvaStructureLevel2 AS level2,p.BbvaStructureLevel3 AS level3
        FROM bbva.Collaborator c
        INNER JOIN bbva.Person p ON p.Id=c.PersonId
        WHERE c.Status=N'ACTIVE'
        ORDER BY fullName;`),
    ]);
    return {
      structures: structures.recordset as EngineeringExplorerSource['structures'],
      specialties: specialties.recordset as EngineeringExplorerSource['specialties'],
      collaborators: collaborators.recordset as EngineeringExplorerSource['collaborators'],
    };
  }

  async structurePairExists(level2Name: string, level3Name: string): Promise<boolean> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('level2', sql.NVarChar(220), level2Name)
      .input('level3', sql.NVarChar(220), level3Name)
      .query(`SELECT TOP 1 1 AS ok
              FROM bbva.StructureCatalog parent
              INNER JOIN bbva.StructureCatalog child ON child.ParentId=parent.Id AND child.LevelCode=3 AND child.Status=N'ACTIVE'
              WHERE parent.LevelCode=2 AND parent.Status=N'ACTIVE'
                AND UPPER(LTRIM(RTRIM(parent.Name)))=UPPER(LTRIM(RTRIM(@level2)))
                AND UPPER(LTRIM(RTRIM(child.Name)))=UPPER(LTRIM(RTRIM(@level3)));`);
    return Boolean(result.recordset[0]?.ok);
  }

  async create(input: EngineeringSpecialtyInput, actor: string) {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('n3', sql.NVarChar(180), input.n3).input('guild', sql.NVarChar(220), input.guild).input('specialty', sql.NVarChar(220), input.specialty)
      .input('guildLeader', sql.NVarChar(220), input.guildLeader).input('specialtyOwner', sql.NVarChar(220), input.specialtyOwner)
      .input('portfolio', sql.NVarChar(220), input.portfolioStaffing).input('staffer', sql.NVarChar(220), input.staffer).input('actor', sql.NVarChar(320), actor)
      .query(`DECLARE @id UNIQUEIDENTIFIER=NEWID();INSERT INTO bbva.EngineeringSpecialtyCatalog(Id,N3,Guild,Specialty,GuildLeader,SpecialtyOwner,PortfolioStaffing,Staffer,Status,CreatedByEmail,UpdatedByEmail) VALUES(@id,@n3,@guild,@specialty,@guildLeader,@specialtyOwner,@portfolio,@staffer,N'ACTIVE',@actor,@actor);SELECT CAST(@id AS NVARCHAR(36)) id;`);
    return (await this.get(String(result.recordset[0].id)))!;
  }

  async update(id: string, input: EngineeringSpecialtyInput, actor: string) {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id).input('n3', sql.NVarChar(180), input.n3).input('guild', sql.NVarChar(220), input.guild).input('specialty', sql.NVarChar(220), input.specialty)
      .input('guildLeader', sql.NVarChar(220), input.guildLeader).input('specialtyOwner', sql.NVarChar(220), input.specialtyOwner)
      .input('portfolio', sql.NVarChar(220), input.portfolioStaffing).input('staffer', sql.NVarChar(220), input.staffer).input('actor', sql.NVarChar(320), actor)
      .query(`UPDATE bbva.EngineeringSpecialtyCatalog SET N3=@n3,Guild=@guild,Specialty=@specialty,GuildLeader=@guildLeader,SpecialtyOwner=@specialtyOwner,PortfolioStaffing=@portfolio,Staffer=@staffer,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actor WHERE Id=@id AND Status<>N'DELETED';SELECT @@ROWCOUNT affected;`);
    return Number(result.recordset[0]?.affected ?? 0) ? this.get(id) : null;
  }

  async status(id: string, status: EngineeringSpecialtyStatus, actor: string) {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).input('status', sql.NVarChar(16), status).input('actor', sql.NVarChar(320), actor)
      .query(`UPDATE bbva.EngineeringSpecialtyCatalog SET Status=@status,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actor WHERE Id=@id AND Status<>N'DELETED';SELECT @@ROWCOUNT affected;`);
    return Number(result.recordset[0]?.affected ?? 0) ? this.get(id) : null;
  }
}
