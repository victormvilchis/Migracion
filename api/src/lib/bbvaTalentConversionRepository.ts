import sql from 'mssql';
import { getDbConnection } from './db.js';
import type { TalentRecord } from './bbvaTalentDomain.js';

export interface TalentConversionResult {
  collaboratorId: string;
  talent: TalentRecord;
}

/** Persistencia transaccional exclusiva del workflow Banco de talento -> Colaboradores. */
export class TalentConversionRepository {
  async convert(current: TalentRecord, actorEmail: string): Promise<TalentConversionResult> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const existing = await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, current.personId)
        .query(`SELECT TOP 1 CAST(Id AS NVARCHAR(36)) AS id, Status AS status FROM bbva.Collaborator WHERE PersonId=@personId;`);

      let collaboratorId: string;
      let historyEvent: string;
      let historyDescription: string;
      if (existing.recordset[0]?.id) {
        collaboratorId = String(existing.recordset[0].id);
        if (String(existing.recordset[0].status).toUpperCase() === 'ACTIVE') {
          throw Object.assign(new Error('La persona ya está activa en Colaboradores.'), { statusCode: 409 });
        }
        historyEvent = 'REACTIVATED_FROM_TALENT';
        historyDescription = 'El colaborador fue reactivado desde Banco de talento.';
        await new sql.Request(transaction)
          .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
          .input('startDate', sql.Date, current.platformStartDate || current.entryDate || null)
          .input('endDate', sql.Date, current.platformEndDate || null)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`UPDATE bbva.Collaborator SET Status=N'ACTIVE', StartDate=COALESCE(@startDate, StartDate), EndDate=@endDate, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail WHERE Id=@collaboratorId;`);
      } else {
        const created = await new sql.Request(transaction)
          .input('personId', sql.UniqueIdentifier, current.personId)
          .input('startDate', sql.Date, current.platformStartDate || current.entryDate || null)
          .input('endDate', sql.Date, current.platformEndDate || null)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`INSERT INTO bbva.Collaborator (PersonId, Status, StartDate, EndDate, CreatedByEmail, UpdatedByEmail) OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id VALUES (@personId, N'ACTIVE', @startDate, @endDate, @actorEmail, @actorEmail);`);
        collaboratorId = String(created.recordset[0].id);
        historyEvent = 'CREATED_FROM_TALENT';
        historyDescription = 'El colaborador fue incorporado desde Banco de talento.';
      }

      await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, current.id)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`UPDATE bbva.TalentBankEntry SET Stage=N'CONVERTED', Active=0, ConvertedAt=SYSUTCDATETIME(), UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail WHERE Id=@id;`);

      await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, current.id)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.TalentHistory (TalentBankEntryId, EventType, Description, CreatedByEmail) VALUES (@entryId, N'CONVERTED', N'La persona pasó de Banco de talento a Colaboradores.', @actorEmail);`);

      await new sql.Request(transaction)
        .input('collaboratorId', sql.UniqueIdentifier, collaboratorId)
        .input('eventType', sql.NVarChar(50), historyEvent)
        .input('description', sql.NVarChar(500), historyDescription)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`INSERT INTO bbva.CollaboratorHistory (CollaboratorId, EventType, Description, CreatedByEmail) VALUES (@collaboratorId, @eventType, @description, @actorEmail);`);

      await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, current.personId)
        .input('effectiveDate', sql.Date, current.platformStartDate || current.entryDate || null)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO bbva.PersonLifecycleHistory (
            PersonId, EventType, FromState, ToState, EffectiveDate, Description, CreatedByEmail
          )
          VALUES (
            @personId, N'TALENT_TO_COLLABORATOR', N'TALENT_BANK', N'COLLABORATOR', @effectiveDate,
            N'La persona pasó de Banco de talento a Colaboradores.', @actorEmail
          );
        `);

      await transaction.commit();
      return { collaboratorId, talent: { ...current, stage: 'CONVERTED', active: false, convertedAt: new Date().toISOString() } };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
