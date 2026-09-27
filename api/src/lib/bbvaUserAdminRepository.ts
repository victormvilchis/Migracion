import sql from 'mssql';
import { getDbConnection } from './db.js';
import type {
  BbvaAdminListParams,
  BbvaAdminPage,
  BbvaAdminStatus,
  BbvaSystemRolePayload,
  BbvaSystemRoleRecord,
  BbvaSystemUserOption,
  BbvaSystemUserPayload,
  BbvaSystemUserRecord,
  BbvaSystemUserRoleRef,
} from './bbvaUserAdminDomain.js';

function paging(params: BbvaAdminListParams) {
  const page = Math.max(0, params.page ?? 0);
  const size = [10, 25, 50, 100].includes(params.size ?? 10) ? (params.size ?? 10) : 10;
  return { page, size, offset: page * size };
}

function roleSelect() {
  return `
    SELECT CAST(r.Id AS NVARCHAR(36)) AS id,r.Code AS code,r.Name AS name,r.Description AS description,
           r.IsDeliveryManager AS isDeliveryManager,r.IsSystem AS isSystem,r.Status AS status,
           (SELECT COUNT(1) FROM bbva.SystemUserRole ur WHERE ur.RoleId=r.Id) AS userCount,
           CONVERT(VARCHAR(33),r.CreatedAt,127) AS createdAt,CONVERT(VARCHAR(33),r.UpdatedAt,127) AS updatedAt
    FROM bbva.SystemRole r
  `;
}

function userSelect() {
  return `
    SELECT CAST(u.Id AS NVARCHAR(36)) AS id,u.FullName AS fullName,u.Email AS email,u.CorporateUser AS corporateUser,
           u.SofttekCode AS softtekCode,u.Status AS status,
           (SELECT COUNT(1) FROM bbva.Collaborator c WHERE UPPER(LTRIM(RTRIM(ISNULL(c.DeliveryManager,N''))))=UPPER(LTRIM(RTRIM(u.FullName)))) AS collaboratorCount,
           CONVERT(VARCHAR(33),u.CreatedAt,127) AS createdAt,CONVERT(VARCHAR(33),u.UpdatedAt,127) AS updatedAt
    FROM bbva.SystemUser u
  `;
}

async function rolesForUsers(userIds: string[]): Promise<Map<string, BbvaSystemUserRoleRef[]>> {
  if (!userIds.length) return new Map();
  const pool = await getDbConnection();
  const result = await pool.request().input('ids', sql.NVarChar(sql.MAX), JSON.stringify(userIds)).query(`
    SELECT CAST(ur.UserId AS NVARCHAR(36)) AS userId,CAST(r.Id AS NVARCHAR(36)) AS id,r.Code AS code,r.Name AS name,r.IsDeliveryManager AS isDeliveryManager
    FROM bbva.SystemUserRole ur
    INNER JOIN bbva.SystemRole r ON r.Id=ur.RoleId
    WHERE ur.UserId IN (SELECT TRY_CONVERT(uniqueidentifier,[value]) FROM OPENJSON(@ids))
    ORDER BY r.Name;
  `);
  const map = new Map<string, BbvaSystemUserRoleRef[]>();
  for (const row of result.recordset as Array<BbvaSystemUserRoleRef & { userId: string }>) {
    map.set(row.userId, [...(map.get(row.userId) ?? []), { id: row.id, code: row.code, name: row.name, isDeliveryManager: Boolean(row.isDeliveryManager) }]);
  }
  return map;
}

export class BbvaUserAdminRepository {
  async listUsers(params: BbvaAdminListParams): Promise<BbvaAdminPage<BbvaSystemUserRecord>> {
    const pool = await getDbConnection();
    const { page, size, offset } = paging(params);
    const search = String(params.search ?? '').trim();
    const status = params.status ?? 'ACTIVE';
    const where = [`(@search=N'' OR u.FullName LIKE @term OR ISNULL(u.Email,N'') LIKE @term OR ISNULL(u.CorporateUser,N'') LIKE @term OR ISNULL(u.SofttekCode,N'') LIKE @term)`];
    if (status !== 'ALL') where.push('u.Status=@status');
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const request = () => pool.request()
      .input('search', sql.NVarChar(220), search)
      .input('term', sql.NVarChar(230), `%${search}%`)
      .input('status', sql.NVarChar(16), status === 'ALL' ? null : status)
      .input('offset', sql.Int, offset)
      .input('size', sql.Int, size);
    const count = await request().query(`SELECT COUNT(1) AS total FROM bbva.SystemUser u ${whereSql};`);
    const userSort: Record<string,string> = { fullName:'u.FullName', email:'u.Email', corporateUser:'u.CorporateUser', softtekCode:'u.SofttekCode', collaboratorCount:'collaboratorCount', status:'u.Status', updatedAt:'u.UpdatedAt' };
    const orderBy = userSort[String(params.sort ?? '')] ?? 'u.FullName';
    const direction = params.direction === 'desc' ? 'DESC' : 'ASC';
    const result = await request().query(`${userSelect()} ${whereSql} ORDER BY ${orderBy} ${direction},u.Id ASC OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;`);
    const rows = result.recordset as BbvaSystemUserRecord[];
    const roleMap = await rolesForUsers(rows.map((item) => item.id));
    const items = rows.map((item) => ({ ...item, collaboratorCount: Number(item.collaboratorCount ?? 0), roles: roleMap.get(item.id) ?? [] }));
    const total = Number(count.recordset[0]?.total ?? 0);
    return { items, page, size, total, totalPages: Math.max(1, Math.ceil(total / size)) };
  }

  async userById(id: string): Promise<BbvaSystemUserRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`${userSelect()} WHERE u.Id=@id;`);
    const item = result.recordset[0] as BbvaSystemUserRecord | undefined;
    if (!item) return null;
    const roleMap = await rolesForUsers([id]);
    return { ...item, collaboratorCount: Number(item.collaboratorCount ?? 0), roles: roleMap.get(id) ?? [] };
  }

  async activeDeliveryManagerByName(fullName: string): Promise<BbvaSystemUserOption | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('name', sql.NVarChar(220), fullName).query(`
      SELECT TOP 1 CAST(u.Id AS NVARCHAR(36)) AS id,u.FullName AS fullName,u.Email AS email,u.CorporateUser AS corporateUser,u.SofttekCode AS softtekCode
      FROM bbva.SystemUser u
      WHERE u.Status=N'ACTIVE' AND UPPER(LTRIM(RTRIM(u.FullName)))=UPPER(LTRIM(RTRIM(@name)))
        AND EXISTS (SELECT 1 FROM bbva.SystemUserRole ur INNER JOIN bbva.SystemRole r ON r.Id=ur.RoleId WHERE ur.UserId=u.Id AND r.Status=N'ACTIVE' AND r.IsDeliveryManager=1);
    `);
    return (result.recordset[0] as BbvaSystemUserOption | undefined) ?? null;
  }

  async userOptions(roleCode = 'DELIVERY_MANAGER'): Promise<BbvaSystemUserOption[]> {
    const pool = await getDbConnection();
    const result = await pool.request().input('roleCode', sql.NVarChar(50), roleCode).query(`
      SELECT CAST(u.Id AS NVARCHAR(36)) AS id,u.FullName AS fullName,u.Email AS email,u.CorporateUser AS corporateUser,u.SofttekCode AS softtekCode
      FROM bbva.SystemUser u
      WHERE u.Status=N'ACTIVE'
        AND EXISTS (
          SELECT 1 FROM bbva.SystemUserRole ur INNER JOIN bbva.SystemRole r ON r.Id=ur.RoleId
          WHERE ur.UserId=u.Id AND r.Status=N'ACTIVE' AND ((@roleCode=N'DELIVERY_MANAGER' AND r.IsDeliveryManager=1) OR r.Code=@roleCode)
        )
      ORDER BY u.FullName,u.Id;
    `);
    return result.recordset as BbvaSystemUserOption[];
  }

  async createUser(input: BbvaSystemUserPayload, actorEmail: string): Promise<BbvaSystemUserRecord> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const created = await new sql.Request(transaction)
        .input('fullName', sql.NVarChar(220), input.fullName)
        .input('email', sql.NVarChar(255), input.email)
        .input('corporateUser', sql.NVarChar(100), input.corporateUser)
        .input('softtekCode', sql.NVarChar(80), input.softtekCode)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.SystemUser(FullName,Email,CorporateUser,SofttekCode,Status,CreatedByEmail,UpdatedByEmail)
                OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id
                VALUES(@fullName,@email,@corporateUser,@softtekCode,N'ACTIVE',@actorEmail,@actorEmail);`);
      const id = String(created.recordset[0].id);
      await this.replaceUserRoles(transaction, id, input.roleIds, actorEmail);
      await transaction.commit();
      return (await this.userById(id)) as BbvaSystemUserRecord;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateUser(id: string, input: BbvaSystemUserPayload, actorEmail: string): Promise<BbvaSystemUserRecord | null> {
    const current = await this.userById(id);
    if (!current) return null;
    if (current.status === 'INACTIVE') throw Object.assign(new Error('Activa el usuario antes de modificar su información.'), { statusCode: 409 });
    const pool = await getDbConnection();
    const dmRoleCheck = await pool.request().input('roles', sql.NVarChar(sql.MAX), JSON.stringify(input.roleIds)).query(`
      SELECT COUNT(1) AS total FROM bbva.SystemRole
      WHERE Status=N'ACTIVE' AND IsDeliveryManager=1
        AND Id IN (SELECT TRY_CONVERT(uniqueidentifier,[value]) FROM OPENJSON(@roles));
    `);
    if (current.collaboratorCount > 0 && Number(dmRoleCheck.recordset[0]?.total ?? 0) === 0) {
      throw Object.assign(new Error('Reasigna los colaboradores antes de retirar el rol de Delivery Manager.'), { statusCode: 409 });
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const result = await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .input('fullName', sql.NVarChar(220), input.fullName)
        .input('email', sql.NVarChar(255), input.email)
        .input('corporateUser', sql.NVarChar(100), input.corporateUser)
        .input('softtekCode', sql.NVarChar(80), input.softtekCode)
        .input('oldName', sql.NVarChar(220), current.fullName)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.SystemUser
          SET FullName=@fullName,Email=@email,CorporateUser=@corporateUser,SofttekCode=@softtekCode,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
          WHERE Id=@id;
          DECLARE @affected INT=@@ROWCOUNT;
          IF @affected>0 AND UPPER(LTRIM(RTRIM(@oldName)))<>UPPER(LTRIM(RTRIM(@fullName)))
            UPDATE bbva.Collaborator SET DeliveryManager=@fullName,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
            WHERE UPPER(LTRIM(RTRIM(ISNULL(DeliveryManager,N''))))=UPPER(LTRIM(RTRIM(@oldName)));
          SELECT @affected AS affected;
        `);
      if (!Number(result.recordset[0]?.affected ?? 0)) { await transaction.rollback(); return null; }
      await this.replaceUserRoles(transaction, id, input.roleIds, actorEmail);
      await transaction.commit();
      return this.userById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private async replaceUserRoles(transaction: sql.Transaction, id: string, roleIds: string[], actorEmail: string): Promise<void> {
    await new sql.Request(transaction).input('id', sql.UniqueIdentifier, id).query(`DELETE FROM bbva.SystemUserRole WHERE UserId=@id;`);
    if (!roleIds.length) return;
    const json = JSON.stringify(roleIds);
    await new sql.Request(transaction)
      .input('id', sql.UniqueIdentifier, id)
      .input('roles', sql.NVarChar(sql.MAX), json)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`
        INSERT INTO bbva.SystemUserRole(UserId,RoleId,AssignedByEmail)
        SELECT @id,r.Id,@actorEmail
        FROM bbva.SystemRole r
        WHERE r.Status=N'ACTIVE' AND r.Id IN (SELECT TRY_CONVERT(uniqueidentifier,[value]) FROM OPENJSON(@roles));
      `);
  }

  async updateUserStatus(id: string, status: BbvaAdminStatus, actorEmail: string): Promise<BbvaSystemUserRecord | null> {
    const current = await this.userById(id);
    if (!current) return null;
    if (status === 'INACTIVE' && current.collaboratorCount > 0) {
      throw Object.assign(new Error('Reasigna los colaboradores antes de inactivar este Delivery Manager.'), { statusCode: 409 });
    }
    const pool = await getDbConnection();
    const result = await pool.request().input('id',sql.UniqueIdentifier,id).input('status',sql.NVarChar(16),status).input('actorEmail',sql.NVarChar(255),actorEmail)
      .query(`UPDATE bbva.SystemUser SET Status=@status,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE Id=@id; SELECT @@ROWCOUNT AS affected;`);
    return Number(result.recordset[0]?.affected ?? 0) ? this.userById(id) : null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const current = await this.userById(id);
    if (!current) return false;
    if (current.status !== 'INACTIVE') throw Object.assign(new Error('Inactiva el usuario antes de eliminarlo definitivamente.'), { statusCode: 409 });
    if (current.collaboratorCount > 0) throw Object.assign(new Error('El usuario está asignado como Delivery Manager. Inactívalo después de reasignar sus colaboradores.'), { statusCode: 409 });
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await new sql.Request(transaction).input('id',sql.UniqueIdentifier,id).query(`DELETE FROM bbva.SystemUserRole WHERE UserId=@id; DELETE FROM bbva.SystemUser WHERE Id=@id;`);
      await transaction.commit();
      return true;
    } catch (error) { await transaction.rollback(); throw error; }
  }

  async reassignDeliveryManager(id: string, targetUserId: string, actorEmail: string): Promise<{ reassigned: number; target: BbvaSystemUserOption }> {
    if (id === targetUserId) throw Object.assign(new Error('Selecciona un Delivery Manager diferente.'), { statusCode: 400 });
    const source = await this.userById(id);
    if (!source) throw Object.assign(new Error('Usuario no encontrado.'), { statusCode: 404 });
    const target = await this.userById(targetUserId);
    if (!target || target.status !== 'ACTIVE' || !target.roles.some((role) => role.isDeliveryManager)) {
      throw Object.assign(new Error('Selecciona un Delivery Manager activo para recibir las asignaciones.'), { statusCode: 400 });
    }
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('sourceName', sql.NVarChar(220), source.fullName)
      .input('targetName', sql.NVarChar(220), target.fullName)
      .input('actorEmail', sql.NVarChar(255), actorEmail)
      .query(`UPDATE bbva.Collaborator
              SET DeliveryManager=@targetName,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
              WHERE UPPER(LTRIM(RTRIM(ISNULL(DeliveryManager,N''))))=UPPER(LTRIM(RTRIM(@sourceName)));
              SELECT @@ROWCOUNT AS reassigned;`);
    return { reassigned: Number(result.recordset[0]?.reassigned ?? 0), target: { id: target.id, fullName: target.fullName, email: target.email, corporateUser: target.corporateUser, softtekCode: target.softtekCode } };
  }

  async listRoles(params: BbvaAdminListParams): Promise<BbvaAdminPage<BbvaSystemRoleRecord>> {
    const pool = await getDbConnection();
    const { page, size, offset } = paging(params);
    const search = String(params.search ?? '').trim();
    const status = params.status ?? 'ACTIVE';
    const where = [`(@search=N'' OR r.Name LIKE @term OR r.Code LIKE @term OR ISNULL(r.Description,N'') LIKE @term)`];
    if (status !== 'ALL') where.push('r.Status=@status');
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const req = () => pool.request().input('search',sql.NVarChar(220),search).input('term',sql.NVarChar(230),`%${search}%`).input('status',sql.NVarChar(16),status==='ALL'?null:status).input('offset',sql.Int,offset).input('size',sql.Int,size);
    const count = await req().query(`SELECT COUNT(1) AS total FROM bbva.SystemRole r ${whereSql};`);
    const roleSort: Record<string,string> = { name:'r.Name', code:'r.Code', userCount:'userCount', status:'r.Status', updatedAt:'r.UpdatedAt' };
    const orderBy = roleSort[String(params.sort ?? '')] ?? 'r.Name';
    const direction = params.direction === 'desc' ? 'DESC' : 'ASC';
    const result = await req().query(`${roleSelect()} ${whereSql} ORDER BY ${orderBy} ${direction},r.IsSystem DESC,r.Id ASC OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;`);
    const total = Number(count.recordset[0]?.total ?? 0);
    return { items:(result.recordset as BbvaSystemRoleRecord[]).map((r)=>({...r,isDeliveryManager:Boolean(r.isDeliveryManager),isSystem:Boolean(r.isSystem),userCount:Number(r.userCount??0)})), page,size,total,totalPages:Math.max(1,Math.ceil(total/size)) };
  }

  async roleById(id: string): Promise<BbvaSystemRoleRecord | null> {
    const pool = await getDbConnection();
    const result = await pool.request().input('id',sql.UniqueIdentifier,id).query(`${roleSelect()} WHERE r.Id=@id;`);
    const row = result.recordset[0] as BbvaSystemRoleRecord | undefined;
    return row ? {...row,isDeliveryManager:Boolean(row.isDeliveryManager),isSystem:Boolean(row.isSystem),userCount:Number(row.userCount??0)} : null;
  }

  async roleOptions(): Promise<BbvaSystemRoleRecord[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`${roleSelect()} WHERE r.Status=N'ACTIVE' ORDER BY r.Name;`);
    return (result.recordset as BbvaSystemRoleRecord[]).map((r)=>({...r,isDeliveryManager:Boolean(r.isDeliveryManager),isSystem:Boolean(r.isSystem),userCount:Number(r.userCount??0)}));
  }

  async createRole(input: BbvaSystemRolePayload, actorEmail: string): Promise<BbvaSystemRoleRecord> {
    const pool=await getDbConnection();
    const created=await pool.request().input('code',sql.NVarChar(50),input.code).input('name',sql.NVarChar(120),input.name).input('description',sql.NVarChar(500),input.description).input('isDm',sql.Bit,input.isDeliveryManager).input('actor',sql.NVarChar(255),actorEmail)
      .query(`INSERT INTO bbva.SystemRole(Code,Name,Description,IsDeliveryManager,IsSystem,Status,CreatedByEmail,UpdatedByEmail) OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id VALUES(@code,@name,@description,@isDm,0,N'ACTIVE',@actor,@actor);`);
    return (await this.roleById(String(created.recordset[0].id))) as BbvaSystemRoleRecord;
  }

  async updateRole(id:string,input:BbvaSystemRolePayload,actorEmail:string):Promise<BbvaSystemRoleRecord|null>{
    const current=await this.roleById(id); if(!current)return null;
    if(current.status==='INACTIVE') throw Object.assign(new Error('Activa el rol antes de modificarlo.'),{statusCode:409});
    const pool=await getDbConnection();
    const result=await pool.request().input('id',sql.UniqueIdentifier,id).input('code',sql.NVarChar(50),current.isSystem?current.code:input.code).input('name',sql.NVarChar(120),input.name).input('description',sql.NVarChar(500),input.description).input('isDm',sql.Bit,input.isDeliveryManager).input('actor',sql.NVarChar(255),actorEmail)
      .query(`UPDATE bbva.SystemRole SET Code=@code,Name=@name,Description=@description,IsDeliveryManager=@isDm,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actor WHERE Id=@id; SELECT @@ROWCOUNT AS affected;`);
    return Number(result.recordset[0]?.affected??0)?this.roleById(id):null;
  }

  async updateRoleStatus(id:string,status:BbvaAdminStatus,actorEmail:string):Promise<BbvaSystemRoleRecord|null>{
    const pool=await getDbConnection();
    const result=await pool.request().input('id',sql.UniqueIdentifier,id).input('status',sql.NVarChar(16),status).input('actor',sql.NVarChar(255),actorEmail)
      .query(`UPDATE bbva.SystemRole SET Status=@status,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actor WHERE Id=@id; SELECT @@ROWCOUNT AS affected;`);
    return Number(result.recordset[0]?.affected??0)?this.roleById(id):null;
  }

  async deleteRole(id:string):Promise<boolean>{
    const current=await this.roleById(id); if(!current)return false;
    if(current.status!=='INACTIVE') throw Object.assign(new Error('Inactiva el rol antes de eliminarlo definitivamente.'),{statusCode:409});
    if(current.isSystem) throw Object.assign(new Error('Los roles base del sistema se conservan. Déjalo inactivo.'),{statusCode:409});
    if(current.userCount>0) throw Object.assign(new Error('El rol tiene usuarios asignados. Retira esas asignaciones antes de eliminarlo.'),{statusCode:409});
    const pool=await getDbConnection(); const result=await pool.request().input('id',sql.UniqueIdentifier,id).query(`DELETE FROM bbva.SystemRole WHERE Id=@id; SELECT @@ROWCOUNT AS affected;`); return Number(result.recordset[0]?.affected??0)>0;
  }
}
