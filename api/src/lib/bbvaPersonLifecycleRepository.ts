import sql from 'mssql';
import { getDbConnection } from './db.js';
import type { CollaboratorRecord } from './bbvaCollaboratorDomain.js';
import type {
  LifecycleReasonOption,
  MoveCollaboratorToTalentInput,
  MoveCollaboratorToTalentResult,
  PersonLifecycleEvent,
} from './bbvaPersonLifecycleDomain.js';

function conflict(message: string): never {
  throw Object.assign(new Error(message), { statusCode: 409 });
}

export class PersonLifecycleRepository {
  async listReasons(): Promise<LifecycleReasonOption[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT Code AS code, Name AS name, DefaultTalentStage AS defaultTalentStage, ISNULL(ReasonGroup,N'OTHER') AS reasonGroup, SortOrder AS sortOrder
      FROM bbva.LifecycleReasonCatalog
      WHERE Status=N'ACTIVE'
      ORDER BY SortOrder ASC, Name ASC;
    `);
    return result.recordset as LifecycleReasonOption[];
  }

  async listTimeline(personId: string): Promise<PersonLifecycleEvent[]> {
    const pool = await getDbConnection();
    const result = await pool.request().input('personId', sql.UniqueIdentifier, personId).query(`
      SELECT *
      FROM (
        SELECT
          CAST(h.Id AS NVARCHAR(36)) AS id,
          h.EventType AS eventType,
          h.Description AS description,
          h.FromState AS fromState,
          h.ToState AS toState,
          h.ReasonCode AS reasonCode,
          r.Name AS reasonName,
          CONVERT(VARCHAR(10), h.EffectiveDate, 23) AS effectiveDate,
          h.Notes AS notes,
          CONVERT(VARCHAR(33), h.CreatedAt, 127) AS createdAt,
          h.CreatedByEmail AS createdByEmail,
          N'LIFECYCLE' AS source
        FROM bbva.PersonLifecycleHistory h
        LEFT JOIN bbva.LifecycleReasonCatalog r ON r.Code=h.ReasonCode
        WHERE h.PersonId=@personId

        UNION ALL

        SELECT
          CAST(h.Id AS NVARCHAR(36)) AS id,
          h.EventType AS eventType,
          h.Description AS description,
          CAST(NULL AS NVARCHAR(30)) AS fromState,
          CAST(NULL AS NVARCHAR(30)) AS toState,
          CAST(NULL AS NVARCHAR(40)) AS reasonCode,
          CAST(NULL AS NVARCHAR(120)) AS reasonName,
          CAST(NULL AS VARCHAR(10)) AS effectiveDate,
          CAST(NULL AS NVARCHAR(1000)) AS notes,
          CONVERT(VARCHAR(33), h.CreatedAt, 127) AS createdAt,
          h.CreatedByEmail AS createdByEmail,
          N'COLLABORATOR' AS source
        FROM bbva.CollaboratorHistory h
        INNER JOIN bbva.Collaborator c ON c.Id=h.CollaboratorId
        WHERE c.PersonId=@personId
          AND h.EventType NOT IN (N'CREATED', N'MOVED_TO_TALENT', N'REACTIVATED_FROM_TALENT', N'CREATED_FROM_TALENT')

        UNION ALL

        SELECT
          CAST(h.Id AS NVARCHAR(36)) AS id,
          h.EventType AS eventType,
          h.Description AS description,
          CAST(NULL AS NVARCHAR(30)) AS fromState,
          CAST(NULL AS NVARCHAR(30)) AS toState,
          CAST(NULL AS NVARCHAR(40)) AS reasonCode,
          CAST(NULL AS NVARCHAR(120)) AS reasonName,
          CAST(NULL AS VARCHAR(10)) AS effectiveDate,
          CAST(NULL AS NVARCHAR(1000)) AS notes,
          CONVERT(VARCHAR(33), h.CreatedAt, 127) AS createdAt,
          h.CreatedByEmail AS createdByEmail,
          N'TALENT_BANK' AS source
        FROM bbva.TalentHistory h
        INNER JOIN bbva.TalentBankEntry t ON t.Id=h.TalentBankEntryId
        WHERE t.PersonId=@personId
          AND h.EventType NOT IN (N'CREATED', N'CONVERTED', N'RETURNED_FROM_COLLABORATOR')
      ) timeline
      ORDER BY createdAt DESC;
    `);
    return result.recordset as PersonLifecycleEvent[];
  }

  async moveCollaboratorToTalent(
    collaborator: CollaboratorRecord,
    input: MoveCollaboratorToTalentInput,
    actorEmail: string,
  ): Promise<MoveCollaboratorToTalentResult> {
    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const lockedCollaborator = await new sql.Request(transaction)
        .input('collaboratorId', sql.UniqueIdentifier, collaborator.id)
        .query(`
          SELECT Status AS status,CONVERT(VARCHAR(33),UpdatedAt,127) AS updatedAt,CAST(PersonId AS NVARCHAR(36)) AS personId
          FROM bbva.Collaborator WITH (UPDLOCK,HOLDLOCK)
          WHERE Id=@collaboratorId;
        `);
      const locked = lockedCollaborator.recordset[0] as { status?: string; updatedAt?: string; personId?: string } | undefined;
      if (!locked || String(locked.status).toUpperCase() !== 'ACTIVE' || String(locked.personId) !== collaborator.personId) {
        conflict('El colaborador cambió de estado en otra vista. Actualiza la pantalla antes de continuar.');
      }
      if (locked.updatedAt !== input.expectedUpdatedAt) {
        conflict('La información del colaborador cambió en otra vista. Actualiza la pantalla antes de moverlo a Banco de talento.');
      }

      const reasonResult = await new sql.Request(transaction)
        .input('reasonCode', sql.NVarChar(40), input.reasonCode)
        .query(`
          SELECT TOP 1 Code AS code, Name AS name, ISNULL(ReasonGroup,N'OTHER') AS reasonGroup
          FROM bbva.LifecycleReasonCatalog
          WHERE Code=@reasonCode AND Status=N'ACTIVE';
        `);
      const reason = reasonResult.recordset[0] as { code: string; name: string; reasonGroup: string } | undefined;
      if (!reason) conflict('El motivo seleccionado no está disponible. Actualiza la pantalla e inténtalo nuevamente.');

      const criticalResolutionResult = await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, collaborator.personId)
        .query(`
          SELECT
            SUM(CASE WHEN resolution.ResolutionStatus=N'PENDING_REVIEW' THEN 1 ELSE 0 END) AS pendingReview,
            SUM(CASE WHEN resolution.ResolutionStatus=N'LOW_REQUESTED' THEN 1 ELSE 0 END) AS lowRequested
          FROM bbva.CertificationCriticalResolution resolution
          INNER JOIN bbva.PersonCertification pc ON pc.Id=resolution.PersonCertificationId
          WHERE pc.PersonId=@personId
            AND resolution.CycleNumber=pc.CurrentCycle
            AND resolution.ResolutionStatus IN (N'PENDING_REVIEW',N'LOW_REQUESTED');
        `);
      const pendingCriticalReviews = Number(criticalResolutionResult.recordset[0]?.pendingReview ?? 0);
      const requestedCriticalLows = Number(criticalResolutionResult.recordset[0]?.lowRequested ?? 0);
      if (pendingCriticalReviews > 0) {
        conflict('La persona tiene un caso crítico 2/2 sin resolver. Primero decide si corresponde solicitar baja o continuar como becario.');
      }
      if (requestedCriticalLows > 0 && reason.reasonGroup !== 'BBVA_EXIT') {
        conflict('La persona tiene una solicitud de baja pendiente por agotamiento 2/2. Para completar el movimiento utiliza un motivo de salida BBVA.');
      }

      const existingTalent = await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, collaborator.personId)
        .query(`
          SELECT TOP 1 CAST(Id AS NVARCHAR(36)) AS id, Active AS active, Stage AS stage, DeletedAt AS deletedAt
          FROM bbva.TalentBankEntry WITH (UPDLOCK,HOLDLOCK)
          WHERE PersonId=@personId;
        `);

      const existing = existingTalent.recordset[0] as { id: string; active: boolean; stage: string; deletedAt: string | null } | undefined;
      if (existing?.active && existing.stage !== 'CONVERTED') {
        conflict('La persona ya tiene un registro activo en Banco de talento. No es posible duplicar su ciclo de vida.');
      }

      let talentBankEntryId: string;
      if (existing?.id) {
        talentBankEntryId = existing.id;
        await new sql.Request(transaction)
          .input('entryId', sql.UniqueIdentifier, talentBankEntryId)
          .input('stage', sql.NVarChar(30), input.talentStage)
          .input('effectiveDate', sql.Date, input.effectiveDate)
          .input('affiliationType', sql.NVarChar(16), input.affiliationType)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`
            UPDATE bbva.TalentBankEntry
            SET TalentType=N'FORMER_COLLABORATOR', AffiliationType=@affiliationType, Stage=@stage, Active=1,
                PlatformStartDate=NULL, DeletedAt=NULL, DeletedByEmail=NULL,
                EntryDate=@effectiveDate, ConvertedAt=NULL,
                UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail
            WHERE Id=@entryId;
          `);
      } else {
        const created = await new sql.Request(transaction)
          .input('personId', sql.UniqueIdentifier, collaborator.personId)
          .input('stage', sql.NVarChar(30), input.talentStage)
          .input('effectiveDate', sql.Date, input.effectiveDate)
          .input('affiliationType', sql.NVarChar(16), input.affiliationType)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`
            INSERT INTO bbva.TalentBankEntry (
              PersonId, TalentType, AffiliationType, Stage, Active, EntryDate, CreatedByEmail, UpdatedByEmail
            )
            OUTPUT CAST(INSERTED.Id AS NVARCHAR(36)) AS id
            VALUES (@personId, N'FORMER_COLLABORATOR', @affiliationType, @stage, 1, @effectiveDate, @actorEmail, @actorEmail);
          `);
        talentBankEntryId = String(created.recordset[0].id);
      }

      await new sql.Request(transaction)
        .input('collaboratorId', sql.UniqueIdentifier, collaborator.id)
        .input('effectiveDate', sql.Date, input.effectiveDate)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          UPDATE bbva.Collaborator
          SET Status=N'INACTIVE',
              UpdatedAt=SYSUTCDATETIME(), UpdatedByEmail=@actorEmail
          WHERE Id=@collaboratorId AND Status=N'ACTIVE';
        `);

      const stageLabel = input.talentStage === 'AVAILABLE' ? 'Disponible' : 'Desasignado';
      const description = `La persona pasó de Colaboradores a Banco de talento. Motivo: ${reason.name}. Etapa destino: ${stageLabel}.`;

      await new sql.Request(transaction)
        .input('collaboratorId', sql.UniqueIdentifier, collaborator.id)
        .input('description', sql.NVarChar(500), description)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO bbva.CollaboratorHistory (CollaboratorId, EventType, Description, CreatedByEmail)
          VALUES (@collaboratorId, N'MOVED_TO_TALENT', @description, @actorEmail);
        `);

      await new sql.Request(transaction)
        .input('entryId', sql.UniqueIdentifier, talentBankEntryId)
        .input('description', sql.NVarChar(500), description)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO bbva.TalentHistory (TalentBankEntryId, EventType, Description, CreatedByEmail)
          VALUES (@entryId, N'RETURNED_FROM_COLLABORATOR', @description, @actorEmail);
        `);

      await new sql.Request(transaction)
        .input('personId', sql.UniqueIdentifier, collaborator.personId)
        .input('reasonCode', sql.NVarChar(40), input.reasonCode)
        .input('effectiveDate', sql.Date, input.effectiveDate)
        .input('description', sql.NVarChar(500), description)
        .input('notes', sql.NVarChar(1000), input.notes)
        .input('actorEmail', sql.NVarChar(255), actorEmail)
        .query(`
          INSERT INTO bbva.PersonLifecycleHistory (
            PersonId, EventType, FromState, ToState, ReasonCode, EffectiveDate,
            Description, Notes, CreatedByEmail
          )
          VALUES (
            @personId, N'COLLABORATOR_TO_TALENT', N'COLLABORATOR', N'TALENT_BANK',
            @reasonCode, @effectiveDate, @description, @notes, @actorEmail
          );
        `);

      if (reason.reasonGroup === 'BBVA_EXIT') {
        await new sql.Request(transaction)
          .input('personId', sql.UniqueIdentifier, collaborator.personId)
          .input('actorEmail', sql.NVarChar(255), actorEmail)
          .query(`
            UPDATE resolution
            SET ResolutionStatus=N'LOW_CONFIRMED',ResolvedAt=SYSUTCDATETIME(),UpdatedAt=SYSUTCDATETIME(),UpdatedByEmail=@actorEmail
            FROM bbva.CertificationCriticalResolution resolution
            INNER JOIN bbva.PersonCertification pc ON pc.Id=resolution.PersonCertificationId
            WHERE pc.PersonId=@personId
              AND resolution.CycleNumber=pc.CurrentCycle
              AND resolution.ResolutionStatus=N'LOW_REQUESTED';

            INSERT INTO bbva.PersonCertificationHistory(PersonCertificationId,EventType,Description,CreatedByEmail)
            SELECT pc.Id,N'CRITICAL_LOW_CONFIRMED',N'La baja de BBVA fue confirmada mediante el ciclo de vida de la persona.',@actorEmail
            FROM bbva.PersonCertification pc
            INNER JOIN bbva.CertificationCriticalResolution resolution ON resolution.PersonCertificationId=pc.Id AND resolution.CycleNumber=pc.CurrentCycle
            WHERE pc.PersonId=@personId AND resolution.ResolutionStatus=N'LOW_CONFIRMED'
              AND NOT EXISTS (
                SELECT 1 FROM bbva.PersonCertificationHistory h
                WHERE h.PersonCertificationId=pc.Id AND h.EventType=N'CRITICAL_LOW_CONFIRMED'
              );
          `);
      }

      await transaction.commit();
      return {
        collaboratorId: collaborator.id,
        talentBankEntryId,
        personId: collaborator.personId,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
