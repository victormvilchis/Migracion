import sql from 'mssql';
import { getDbConnection } from './db.js';

export interface BbvaOperationalQuarterOverride {
  quarterCode: string;
  sourceStartDate: string | null;
  sourceEndDate: string | null;
  sourceConfigured: boolean;
  operationalStartDate: string;
  operationalEndDate: string;
  updatedAt: string | null;
  updatedByEmail: string | null;
}

export interface BbvaOperationalQuarterWrite {
  quarterCode:string;
  sourceStartDate:string | null;
  sourceEndDate:string | null;
  sourceConfigured:boolean;
  operationalStartDate:string;
  operationalEndDate:string;
}

export class BbvaOperationalQuarterRepository {
  async listOverrides(): Promise<BbvaOperationalQuarterOverride[]> {
    const pool = await getDbConnection();
    const schema = await pool.request().query(`SELECT CASE WHEN OBJECT_ID(N'bbva.OperationalQuarterConfig',N'U') IS NULL THEN 0 ELSE 1 END AS tableReady, CASE WHEN COL_LENGTH(N'bbva.OperationalQuarterConfig',N'SourceStartDate') IS NULL THEN 0 ELSE 1 END AS sourceReady;`);
    if(!Number(schema.recordset[0]?.tableReady??0)) return [];
    const sourceReady=Boolean(Number(schema.recordset[0]?.sourceReady??0));
    const result = sourceReady
      ? await pool.request().query(`SELECT QuarterCode AS quarterCode,CONVERT(VARCHAR(10),SourceStartDate,23) AS sourceStartDate,CONVERT(VARCHAR(10),SourceEndDate,23) AS sourceEndDate,SourceConfigured AS sourceConfigured,CONVERT(VARCHAR(10),OperationalStartDate,23) AS operationalStartDate,CONVERT(VARCHAR(10),OperationalEndDate,23) AS operationalEndDate,CONVERT(VARCHAR(33),UpdatedAt,127) AS updatedAt,UpdatedByEmail AS updatedByEmail FROM bbva.OperationalQuarterConfig ORDER BY QuarterCode;`)
      : await pool.request().query(`SELECT QuarterCode AS quarterCode,CAST(NULL AS VARCHAR(10)) AS sourceStartDate,CAST(NULL AS VARCHAR(10)) AS sourceEndDate,CAST(0 AS BIT) AS sourceConfigured,CONVERT(VARCHAR(10),OperationalStartDate,23) AS operationalStartDate,CONVERT(VARCHAR(10),OperationalEndDate,23) AS operationalEndDate,CONVERT(VARCHAR(33),UpdatedAt,127) AS updatedAt,UpdatedByEmail AS updatedByEmail FROM bbva.OperationalQuarterConfig ORDER BY QuarterCode;`);
    return (result.recordset as any[]).map((row)=>({...row,sourceConfigured:Boolean(row.sourceConfigured)})) as BbvaOperationalQuarterOverride[];
  }

  private async assertReady():Promise<void>{
    const pool=await getDbConnection();
    const exists=await pool.request().query(`SELECT CASE WHEN OBJECT_ID(N'bbva.OperationalQuarterConfig',N'U') IS NOT NULL AND COL_LENGTH(N'bbva.OperationalQuarterConfig',N'SourceStartDate') IS NOT NULL THEN 1 ELSE 0 END AS ready;`);
    if(!Number(exists.recordset[0]?.ready??0)) throw Object.assign(new Error('Falta aplicar la migración de periodos multiaño.'),{statusCode:409});
  }

  async upsertConfiguration(input:BbvaOperationalQuarterWrite, actorEmail:string):Promise<void>{
    await this.assertReady();
    const pool=await getDbConnection();
    await pool.request()
      .input('quarterCode',sql.NVarChar(16),input.quarterCode)
      .input('sourceStartDate',sql.Date,input.sourceStartDate)
      .input('sourceEndDate',sql.Date,input.sourceEndDate)
      .input('sourceConfigured',sql.Bit,input.sourceConfigured)
      .input('startDate',sql.Date,input.operationalStartDate)
      .input('endDate',sql.Date,input.operationalEndDate)
      .input('actorEmail',sql.NVarChar(255),actorEmail)
      .query(`
        MERGE bbva.OperationalQuarterConfig AS target
        USING (SELECT @quarterCode AS QuarterCode) AS source
        ON target.QuarterCode=source.QuarterCode
        WHEN MATCHED THEN UPDATE SET SourceStartDate=@sourceStartDate,SourceEndDate=@sourceEndDate,SourceConfigured=@sourceConfigured,OperationalStartDate=@startDate,OperationalEndDate=@endDate,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
        WHEN NOT MATCHED THEN INSERT(QuarterCode,SourceStartDate,SourceEndDate,SourceConfigured,OperationalStartDate,OperationalEndDate,UpdatedAt,UpdatedByEmail)
          VALUES(@quarterCode,@sourceStartDate,@sourceEndDate,@sourceConfigured,@startDate,@endDate,SYSUTCDATETIME(),@actorEmail);
      `);
  }

  async createYear(rows:BbvaOperationalQuarterWrite[], actorEmail:string):Promise<void>{
    await this.assertReady();
    const pool=await getDbConnection();
    const transaction=new sql.Transaction(pool);await transaction.begin();
    try{
      for(const row of rows){
        const exists=await new sql.Request(transaction).input('quarterCode',sql.NVarChar(16),row.quarterCode).query(`SELECT COUNT(1) AS total FROM bbva.OperationalQuarterConfig WHERE QuarterCode=@quarterCode;`);
        if(Number(exists.recordset[0]?.total??0)>0) throw Object.assign(new Error(`El periodo ${row.quarterCode} ya existe.`),{statusCode:409});
        await new sql.Request(transaction)
          .input('quarterCode',sql.NVarChar(16),row.quarterCode)
          .input('sourceStartDate',sql.Date,row.sourceStartDate)
          .input('sourceEndDate',sql.Date,row.sourceEndDate)
          .input('sourceConfigured',sql.Bit,row.sourceConfigured)
          .input('startDate',sql.Date,row.operationalStartDate)
          .input('endDate',sql.Date,row.operationalEndDate)
          .input('actorEmail',sql.NVarChar(255),actorEmail)
          .query(`INSERT INTO bbva.OperationalQuarterConfig(QuarterCode,SourceStartDate,SourceEndDate,SourceConfigured,OperationalStartDate,OperationalEndDate,UpdatedAt,UpdatedByEmail) VALUES(@quarterCode,@sourceStartDate,@sourceEndDate,@sourceConfigured,@startDate,@endDate,SYSUTCDATETIME(),@actorEmail);`);
      }
      await transaction.commit();
    }catch(error){await transaction.rollback();throw error;}
  }

  async resetOperational(quarterCode:string,operationalStartDate:string,operationalEndDate:string,actorEmail:string):Promise<void>{
    const pool=await getDbConnection();
    await pool.request().input('quarterCode',sql.NVarChar(16),quarterCode).input('startDate',sql.Date,operationalStartDate).input('endDate',sql.Date,operationalEndDate).input('actorEmail',sql.NVarChar(255),actorEmail)
      .query(`IF OBJECT_ID(N'bbva.OperationalQuarterConfig',N'U') IS NOT NULL UPDATE bbva.OperationalQuarterConfig SET OperationalStartDate=@startDate,OperationalEndDate=@endDate,UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail WHERE QuarterCode=@quarterCode;`);
  }

  async invalidateMetricSnapshots(quarterCode:string):Promise<void>{
    const pool=await getDbConnection();
    await pool.request().input('quarterCode',sql.NVarChar(16),quarterCode)
      .query(`IF OBJECT_ID(N'bbva.DashboardMetricSnapshot',N'U') IS NOT NULL DELETE FROM bbva.DashboardMetricSnapshot WHERE QuarterCode=@quarterCode;`);
  }

  /** Compatibilidad con V31.8: sólo modifica la ventana operativa. */
  async upsert(quarterCode:string,operationalStartDate:string,operationalEndDate:string,actorEmail:string):Promise<void>{
    const existing=(await this.listOverrides()).find((item)=>item.quarterCode===quarterCode);
    await this.upsertConfiguration({quarterCode,sourceStartDate:existing?.sourceStartDate??null,sourceEndDate:existing?.sourceEndDate??null,sourceConfigured:existing?.sourceConfigured??false,operationalStartDate,operationalEndDate},actorEmail);
  }

  async deletePeriod(quarterCode:string):Promise<void>{
    await this.assertReady();
    const pool=await getDbConnection();
    const transaction=new sql.Transaction(pool);await transaction.begin();
    try{
      await new sql.Request(transaction).input('quarterCode',sql.NVarChar(16),quarterCode)
        .query(`IF OBJECT_ID(N'bbva.DashboardMetricSnapshot',N'U') IS NOT NULL DELETE FROM bbva.DashboardMetricSnapshot WHERE QuarterCode=@quarterCode;`);
      await new sql.Request(transaction).input('quarterCode',sql.NVarChar(16),quarterCode)
        .query(`DELETE FROM bbva.OperationalQuarterConfig WHERE QuarterCode=@quarterCode;`);
      await transaction.commit();
    }catch(error){await transaction.rollback();throw error;}
  }

  async deleteYear(year:number):Promise<void>{
    await this.assertReady();
    const pool=await getDbConnection();
    const transaction=new sql.Transaction(pool);await transaction.begin();
    const prefix=`${year}Q%`;
    try{
      await new sql.Request(transaction).input('prefix',sql.NVarChar(16),prefix)
        .query(`IF OBJECT_ID(N'bbva.DashboardMetricSnapshot',N'U') IS NOT NULL DELETE FROM bbva.DashboardMetricSnapshot WHERE QuarterCode LIKE @prefix;`);
      await new sql.Request(transaction).input('prefix',sql.NVarChar(16),prefix)
        .query(`DELETE FROM bbva.OperationalQuarterConfig WHERE QuarterCode LIKE @prefix;`);
      await transaction.commit();
    }catch(error){await transaction.rollback();throw error;}
  }

  async delete(quarterCode:string):Promise<void>{return this.deletePeriod(quarterCode);}
}
