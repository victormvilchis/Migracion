import sql from 'mssql';

const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;

let globalPool: sql.ConnectionPool | null = null;
let poolConnectPromise: Promise<sql.ConnectionPool> | null = null;

export interface DbConnectionOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Obtiene o crea el pool de conexión a la base de datos (SQL Server local o Azure SQL).
 */
export async function getDbConnection(options?: DbConnectionOptions): Promise<sql.ConnectionPool> {
  if (!connectionString) {
    throw new Error('AZURE_SQL_CONNECTION_STRING no está definido en las variables de entorno.');
  }

  if (globalPool?.connected) {
    return globalPool;
  }

  if (poolConnectPromise) {
    return poolConnectPromise;
  }

  const maxRetries = options?.maxRetries ?? 3;
  const retryDelay = options?.retryDelayMs ?? 1500;

  let retries = 0;

  const connectWithRetry = async (): Promise<sql.ConnectionPool> => {
    while (retries < maxRetries) {
      try {
        const pool = new sql.ConnectionPool(connectionString);

        pool.on('error', (err) => {
          console.error('[SQL Pool Error]', err);
          globalPool = null;
          poolConnectPromise = null;
        });

        await pool.connect();
        globalPool = pool;
        return pool;
      } catch (err: any) {
        retries++;
        if (retries >= maxRetries) {
          globalPool = null;
          poolConnectPromise = null;
          throw new Error(`[SQL] No se pudo conectar a la base de datos tras ${maxRetries} intentos: ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
    throw new Error('[SQL] Error inesperado en el ciclo de conexión.');
  };

  poolConnectPromise = connectWithRetry().finally(() => {
    poolConnectPromise = null;
  });

  return poolConnectPromise;
}

/**
 * Cierra el pool activo si existe (útil en teardowns).
 */
export async function closeDbConnection(): Promise<void> {
  if (globalPool) {
    try {
      await globalPool.close();
    } catch {
      // Ignorar error al cerrar
    } finally {
      globalPool = null;
      poolConnectPromise = null;
    }
  }
}
