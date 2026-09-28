import sql from 'mssql';
import { getDbConnection } from './db.js';
import type { TalentRecord } from './bbvaTalentDomain.js';

export interface TalentConversionResult {
  collaboratorId: string;
  talent: TalentRecord;
}

export interface TalentConversionInput {
  expectedUpdatedAt: string;
  deliveryManager: string;
  profileCatalogId: string;
  profile: string | null;
  technologyProfileCatalogId: string;
  technologyProfile: string | null;
  currentTechnologyCatalogId: string;
  currentTechnology: string | null;
  expertise: string | null;
  bbvaUser: string | null;
}

/** Persistencia transaccional exclusiva del workflow Banco de talento -> Colaboradores. */
export class TalentConversionRepository {
  async convert(current: TalentRecord, input: TalentConversionInput, actorEmail: string): Promise<TalentConversionResult> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const lockedTalent = await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, current.id)
        .query(`
          SELECT CAST(PersonId AS NVARCHAR(36)) AS personId,Stage,Active,DeletedAt,
                 CONVERT(VARCHAR(33),UpdatedAt,127) AS updatedAt,
                 CONVERT(VARCHAR(10),PlatformStartDate,23) AS platformStartDate,
                 CONVERT(VARCHAR(10),EntryDate,23) AS entryDate
          FROM bbva.TalentBankEntry WITH (UPDLOCK,HOLDLOCK)
          WHERE Id=@id;
        `);
      const locked = lockedTalent.recordset[0] as { personId?: string; Stage?: string; Active?: boolean; DeletedAt?: Date | null; updatedAt?: string; platformStartDate?: string | null; entryDate?: string | null } | undefined;
      if (!locked || locked.DeletedAt || !locked.Active || String(locked.Stage).toUpperCase() === 'CONVERTED') {
        throw Object.assign(new Error('El talento cambió de estado en otra vista. Actualiza la pantalla antes de continuar.'), { statusCode: 409 });
      }
      if (locked.updatedAt !== input.expectedUpdatedAt) {
        throw Object.assign(new Error('La información cambió en otra vista. Actualiza la pantalla antes de convertir para evitar sobrescribir cambios recientes.'), { statusCode: 409 });
      }
      if (String(locked.personId) !== current.personId) {
        throw Object.assign(new Error('La identidad del talento cambió. Actualiza la pantalla antes de continuar.'), { statusCode: 409 });
      }

      await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, current.personId)
        .input('profileCatalogId', sql.UniqueIdentifier, input.profileCatalogId)
        .input('profile', sql.NVarChar(180), input.profile)
        .input('technologyProfileCatalogId', sql.UniqueIdentifier, input.technologyProfileCatalogId)
        .input('technologyProfile', sql.NVarChar(180), input.technologyProfile)
        .input('currentTechnologyCatalogId', sql.UniqueIdentifier, input.currentTechnologyCatalogId)
        .input('currentTechnology', sql.NVarChar(180), input.currentTechnology)
        .input('expertise', sql.NVarChar(40), input.expertise)
        .input('bbvaUser', sql.NVarChar(100), input.bbvaUser)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.Person
          SET Profile=@profile,ProfileCatalogId=@profileCatalogId,
              TechnologyProfile=@technologyProfile,TechnologyProfileCatalogId=@technologyProfileCatalogId,
              CurrentTechnology=@currentTechnology,CurrentTechnologyCatalogId=@currentTechnologyCatalogId,
              Expertise=@expertise,CorporateUser=@bbvaUser,BbvaUser=@bbvaUser,
              UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
          WHERE Id=@personId;
        `);

      const effectiveStartDate = locked.platformStartDate || locked.entryDate || current.platformStartDate || current.entryDate || null;

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
          .input('startDate', sql.Date, effectiveStartDate)
          .input('deliveryManager', sql.NVarChar(180), input.deliveryManager)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`UPDATE bbva.Collaborator SET Status=N'ACTIVE', StartDate=COALESCE(@startDate, StartDate), DeliveryManager=@deliveryManager, UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail WHERE Id=@collaboratorId;`);
      } else {
        const created = await new sql.Request(transaction)
          .input('personId', sql.UniqueIdentifier, current.personId)
          .input('startDate', sql.Date, effectiveStartDate)
          .input('deliveryManager', sql.NVarChar(180), input.deliveryManager)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`INSERT INTO bbva.Collaborator (PersonId, Status, StartDate, DeliveryManager, CreatedByEmail, UpdatedByEmail) OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id VALUES (@personId, N'ACTIVE', @startDate, @deliveryManager, @actorEmail, @actorEmail);`);
        collaboratorId = String(created.recordset[0].id);
        historyEvent = 'CREATED_FROM_TALENT';
        historyDescription = 'El colaborador fue incorporado desde Banco de talento.';
      }

      await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, current.id)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`UPDATE bbva.TalentBankEntry SET Stage=N'CONVERTED', Active=0, ConvertedAt=SYSUTCDATETIME(), UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail WHERE Id=@id AND Stage<>N'CONVERTED' AND Active=1 AND DeletedAt IS NULL;`);

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
        .input('effectiveDate', sql.Date, effectiveStartDate)
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
