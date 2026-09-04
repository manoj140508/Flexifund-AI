import { Pool, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

/**
 * Returns the singleton PostgreSQL pool instance.
 * Lazy-initialized so it does not fail during Next.js build / route collection.
 */
export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not configured. Please set the DATABASE_URL environment variable.'
    );
  }

  const isLocal =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1') ||
    connectionString.includes('host.docker.internal');

  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  return pool;
}

/**
 * Ensures the required tables (users and sessions) exist in PostgreSQL.
 * Executes automatically on first query.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    const currentPool = getPool();
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `);
  })();

  return schemaPromise;
}

/**
 * Executes a parameterized SQL query with automatic schema initialization.
 */
export async function query<R extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<R>> {
  await ensureSchema();
  const currentPool = getPool();
  return currentPool.query<R>(text, params);
}
