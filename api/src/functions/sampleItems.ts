import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import sql from 'mssql';
import { getDbConnection } from '../lib/db.js';
import { getCurrentUser } from '../lib/authzLocal.js';

interface SampleItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdByEmail: string;
  createdAt: string;
}

// Respaldo en memoria si SQL Server aún no se ha iniciado
let inMemoryItems: SampleItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Iniciar contenedor de SQL Server',
    description: 'Ejecuta "docker compose up -d" en la raíz del proyecto para persistir en SQL Server.',
    category: 'DevOps',
    status: 'Pendiente',
    createdByEmail: 'francisco.barrera@softtek.com',
    createdAt: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'Probar llamada a Azure OpenAI',
    description: 'Navega a la sección de Asistente AI para probar el chat local.',
    category: 'AI',
    status: 'En Progreso',
    createdByEmail: 'developer@softtek.com',
    createdAt: new Date().toISOString(),
  },
];

export async function sampleItemsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const method = request.method;
  const user = getCurrentUser(request);

  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await getDbConnection({ maxRetries: 1, retryDelayMs: 300 });
  } catch {
    // Si SQL Server no está listo, se usa el almacén temporal en memoria
  }

  // --- GET: Listar elementos ---
  if (method === 'GET') {
    if (pool) {
      try {
        const result = await pool.request().query(`
          SELECT 
            CAST(Id AS NVARCHAR(36)) AS id,
            Title AS title,
            Description AS description,
            Category AS category,
            Status AS status,
            CreatedByEmail AS createdByEmail,
            CONVERT(VARCHAR(30), CreatedAt, 127) AS createdAt
          FROM dbo.SampleItems
          ORDER BY CreatedAt DESC;
        `);
        return {
          status: 200,
          jsonBody: {
            items: result.recordset,
            storage: 'sql-server',
          },
        };
      } catch (sqlErr: any) {
        context.warn('Error leyendo de SQL Server, usando memoria:', sqlErr?.message);
      }
    }

    return {
      status: 200,
      jsonBody: {
        items: inMemoryItems,
        storage: 'in-memory-fallback',
        warning: 'SQL Server no está conectado. Mostrando datos en memoria.',
      },
    };
  }

  // --- POST: Crear elemento ---
  if (method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const title = String(body?.title || '').trim();
      const description = String(body?.description || '').trim();
      const category = String(body?.category || 'General').trim();
      const status = String(body?.status || 'Activo').trim();

      if (!title) {
        return { status: 400, jsonBody: { error: 'El campo "title" es requerido.' } };
      }

      if (pool) {
        try {
          const insertResult = await pool
            .request()
            .input('title', sql.NVarChar(150), title)
            .input('description', sql.NVarChar(sql.MAX), description)
            .input('category', sql.NVarChar(50), category)
            .input('status', sql.NVarChar(30), status)
            .input('createdByEmail', sql.NVarChar(255), user.email).query(`
              INSERT INTO dbo.SampleItems (Title, Description, Category, Status, CreatedByEmail)
              OUTPUT 
                CAST(INSERTED.Id AS NVARCHAR(36)) AS id,
                INSERTED.Title AS title,
                INSERTED.Description AS description,
                INSERTED.Category AS category,
                INSERTED.Status AS status,
                INSERTED.CreatedByEmail AS createdByEmail,
                CONVERT(VARCHAR(30), INSERTED.CreatedAt, 127) AS createdAt
              VALUES (@title, @description, @category, @status, @createdByEmail);
            `);

          return {
            status: 201,
            jsonBody: {
              item: insertResult.recordset[0],
              storage: 'sql-server',
            },
          };
        } catch (sqlErr: any) {
          context.warn('Error insertando en SQL Server, guardando en memoria:', sqlErr?.message);
        }
      }

      const newItem: SampleItem = {
        id: `mock-${Date.now()}`,
        title,
        description,
        category,
        status,
        createdByEmail: user.email,
        createdAt: new Date().toISOString(),
      };
      inMemoryItems.unshift(newItem);

      return {
        status: 201,
        jsonBody: {
          item: newItem,
          storage: 'in-memory-fallback',
        },
      };
    } catch (err: any) {
      return { status: 400, jsonBody: { error: 'Payload JSON inválido.' } };
    }
  }

  // --- DELETE: Eliminar elemento ---
  if (method === 'DELETE') {
    const id = request.params.id;
    if (!id) {
      return { status: 400, jsonBody: { error: 'ID es requerido para eliminar.' } };
    }

    if (pool) {
      try {
        await pool.request().input('id', sql.UniqueIdentifier, id).query(`
          DELETE FROM dbo.SampleItems WHERE Id = @id;
        `);
        return { status: 200, jsonBody: { success: true, storage: 'sql-server' } };
      } catch (sqlErr: any) {
        context.warn('Error eliminando en SQL Server:', sqlErr?.message);
      }
    }

    inMemoryItems = inMemoryItems.filter((i) => i.id !== id);
    return { status: 200, jsonBody: { success: true, storage: 'in-memory-fallback' } };
  }

  return { status: 405, jsonBody: { error: 'Método no permitido' } };
}

app.http('sampleItems', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'items',
  handler: sampleItemsHandler,
});

app.http('sampleItemsDelete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'items/{id}',
  handler: sampleItemsHandler,
});
