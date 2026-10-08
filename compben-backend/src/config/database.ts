import { Pool, QueryResult, QueryResultRow } from 'pg';
import logger from './logger';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  min: Number(process.env.DB_POOL_MIN) || 2,
  max: Number(process.env.DB_POOL_MAX) || 10,
});

pool.on('connect', () => logger.debug('📦 Database connected'));
pool.on('error', (err) => logger.error('Database error:', err));

/**
 * Query helper dengan type-safe generic
 * @example
 * const result = await query<User>('SELECT * FROM users WHERE id = $1', [1]);
 * console.log(result.rows[0].username);
 */
export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  logger.debug(`Query ${Date.now() - start}ms: ${text.substring(0, 80)}...`);
  return result;
};

/**
 * Transaction helper
 * @example
 * await transaction(async (client) => {
 *   await client.query('INSERT INTO users ...');
 *   await client.query('INSERT INTO audit ...');
 * });
 */
export const transaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export { pool };
