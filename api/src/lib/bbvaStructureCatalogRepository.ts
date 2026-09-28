import sql from 'mssql';
import { getDbConnection } from './db.js';
import type { BbvaStructureInput, BbvaStructureOption, BbvaStructureRecord, BbvaStructureStatus } from './bbvaStructureCatalogDomain.js';

const columns = `
  CAST(s.Id AS NVARCHAR(36)) AS id,
  CAST(s.LevelCode AS INT) AS level,
  CAST(s.ParentId AS NVARCHAR(36)) AS parentId,
  parent.Name AS parentName,
  s.Name AS name,
  s.Description AS description,
  s.Status AS status,
  CAST(CASE WHEN s.LevelCode=2
    THEN (SELECT COUNT_BIG(1) FROM bbva.Person p WHERE UPPER(LTRIM(RTRIM(ISNULL(p.BbvaStructureLevel2,N''))))=UPPER(LTRIM(RTRIM(s.Name))))
    ELSE (SELECT COUNT_BIG(1) FROM bbva.Person p WHERE UPPER(LTRIM(RTRIM(ISNULL(p.BbvaStructureLevel3,N''))))=UPPER(LTRIM(RTRIM(s.Name))) AND UPPER(LTRIM(RTRIM(ISNULL(p.BbvaStructureLevel2,N''))))=UPPER(LTRIM(RTRIM(ISNULL(parent.Name,N''))))) END AS INT) AS usageCount,
  CAST(CASE WHEN s.LevelCode=2 THEN (SELECT COUNT_BIG(1) FROM bbva.StructureCatalog child WHERE child.ParentId=s.Id AND child.Status<>N'DELETED') ELSE 0 END AS INT) AS childCount,
  CONVERT(VARCHAR(33),s.CreatedAt,127) AS createdAt,
  CONVERT(VARCHAR(33),s.UpdatedAt,127) AS updatedAt,
  s.CreatedByEmail AS createdByEmail,
  s.UpdatedByEmail AS updatedByEmail
`;

export class BbvaStructureCatalogRepository {
  async list(search = '', status: BbvaStructureStatus | 'ALL' = 'ACTIVE'): Promise<BbvaStructureRecord[]> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('search', sql.NVarChar(220), `%${search.trim()}%`)
      .input('status', sql.NVarChar(16), status === 'ALL' ? null : status)
      .query(`SELECT ${columns} FROM bbva.StructureCatalog s LEFT JOIN bbva.StructureCatalog parent ON parent.Id=s.ParentId
              WHERE s.Status<>N'DELETED' AND (@status IS NULL OR s.Status=@status) AND (@search=N'%%' OR s.Name LIKE @search OR ISNULL(s.Description,N'') LIKE @search OR ISNULL(parent.Name,N'') LIKE @search)
              ORDER BY s.LevelCode,s.Name;`);
    return result.recordset as BbvaStructureRecord[];
  }

  async options(): Promise<BbvaStructureOption[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`SELECT CAST(s.Id AS NVARCHAR(36)) AS id,CAST(s.LevelCode AS INT) AS level,CAST(s.ParentId AS NVARCHAR(36)) AS parentId,parent.Name AS parentName,s.Name AS name
      FROM bbva.StructureCatalog s LEFT JOIN bbva.StructureCatalog parent ON parent.Id=s.ParentId WHERE s.Status=N'ACTIVE' ORDER BY s.LevelCode,s.Name;`);
    return result.recordset as BbvaStructureOption[];
  }

  async get(id: string): Promise<BbvaStructureRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id',sql.UniqueIdentifier,id).query(`SELECT ${columns} FROM bbva.StructureCatalog s LEFT JOIN bbva.StructureCatalog parent ON parent.Id=s.ParentId WHERE s.Id=@id AND s.Status<>N'DELETED';`);
    return (result.recordset[0] as BbvaStructureRecord | undefined) ?? null;
  }

  async create(input: BbvaStructureInput, actorEmail: string): Promise<BbvaStructureRecord> {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('level',sql.TinyInt,input.level).input('parentId',sql.UniqueIdentifier,input.parentId).input('name',sql.NVarChar(220),input.name).input('description',sql.NVarChar(500),input.description).input('actor',sql.NVarChar(320),actorEmail)
      .query(`DECLARE @id UNIQUEIDENTIFIER=NEWID(); INSERT INTO bbva.StructureCatalog(Id,LevelCode,ParentId,Name,Description,Status,CreatedByEmail,UpdatedByEmail) VALUES(@id,@level,@parentId,@name,@description,N'ACTIVE',@actor,@actor); SELECT CAST(@id AS NVARCHAR(36)) AS id;`);
    return (await this.get(String(result.recordset[0].id)))!;
  }

  async update(id: string, input: BbvaStructureInput, actorEmail: string): Promise<BbvaStructureRecord | null> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool); await transaction.begin();
    try {
      const currentResult = await new sql.Request(transaction).input('id',sql.UniqueIdentifier,id).query(`SELECT LevelCode,ParentId,Name FROM bbva.StructureCatalog WITH (UPDLOCK,HOLDLOCK) WHERE Id=@id AND Status<>N'DELETED';`);
      const current=currentResult.recordset[0]; if(!current){await transaction.rollback();return null;}
      if(Number(current.LevelCode)!==input.level) throw Object.assign(new Error('El nivel de una estructura existente no puede cambiarse.'),{statusCode:409});
      let oldParentName:string|null=null; let newParentName:string|null=null;
      if(input.level===3){
        const parents=await new sql.Request(transaction).input('oldParentId',sql.UniqueIdentifier,current.ParentId).input('newParentId',sql.UniqueIdentifier,input.parentId).query(`SELECT Id,Name FROM bbva.StructureCatalog WHERE Id IN (@oldParentId,@newParentId);`);
        oldParentName=parents.recordset.find((r:any)=>String(r.Id).toLowerCase()===String(current.ParentId).toLowerCase())?.Name??null;
        newParentName=parents.recordset.find((r:any)=>String(r.Id).toLowerCase()===String(input.parentId).toLowerCase())?.Name??null;
      }
      await new sql.Request(transaction).input('id',sql.UniqueIdentifier,id).input('parentId',sql.UniqueIdentifier,input.parentId).input('name',sql.NVarChar(220),input.name).input('description',sql.NVarChar(500),input.description).input('actor',sql.NVarChar(320),actorEmail).query(`UPDATE bbva.StructureCatalog SET ParentId=@parentId,Name=@name,Description=@description,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actor WHERE Id=@id;`);
      const personRequest=new sql.Request(transaction).input('oldName',sql.NVarChar(220),current.Name).input('newName',sql.NVarChar(220),input.name);
      if(input.level===2){
        personRequest.input('actor',sql.NVarChar(320),actorEmail);
        await personRequest.query(`UPDATE bbva.Person SET BbvaStructureLevel2=@newName,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actor WHERE UPPER(LTRIM(RTRIM(ISNULL(BbvaStructureLevel2,N''))))=UPPER(LTRIM(RTRIM(@oldName)));`);
      } else {
        personRequest.input('oldParent',sql.NVarChar(220),oldParentName).input('newParent',sql.NVarChar(220),newParentName).input('actor',sql.NVarChar(320),actorEmail);
        await personRequest.query(`UPDATE bbva.Person SET BbvaStructureLevel3=@newName,BbvaStructureLevel2=COALESCE(@newParent,BbvaStructureLevel2),UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actor WHERE UPPER(LTRIM(RTRIM(ISNULL(BbvaStructureLevel3,N''))))=UPPER(LTRIM(RTRIM(@oldName))) AND UPPER(LTRIM(RTRIM(ISNULL(BbvaStructureLevel2,N''))))=UPPER(LTRIM(RTRIM(ISNULL(@oldParent,N'')));`);
      }
      await transaction.commit(); return this.get(id);
    } catch(e){try{await transaction.rollback();}catch{} throw e;}
  }

  async updateStatus(id:string,status:BbvaStructureStatus,actorEmail:string){const pool=await getDbConnection();await pool.request().input('id',sql.UniqueIdentifier,id).input('status',sql.NVarChar(16),status).input('actor',sql.NVarChar(320),actorEmail).query(`UPDATE bbva.StructureCatalog SET Status=@status,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actor WHERE Id=@id AND Status<>N'DELETED';`);return this.get(id);}
  async delete(id:string){const item=await this.get(id);if(!item)return false;if(item.usageCount>0||item.childCount>0)throw Object.assign(new Error('La estructura tiene usos o estructuras hijas y no puede eliminarse.'),{statusCode:409});const pool=await getDbConnection();await pool.request().input('id',sql.UniqueIdentifier,id).query(`DELETE FROM bbva.StructureCatalog WHERE Id=@id;`);return true;}
}
