/**
 * LIATDULU - Database Module
 * 
 * PostgreSQL database client and queries for Vercel Postgres
 */

import { getEnv } from './env.js';
import { DatabaseError } from './errors.js';

// PostgreSQL connection pool
let pool = null;

/**
 * Get database connection pool
 * Creates pool on first use
 * 
 * @returns {Promise<PgPool>} PostgreSQL connection pool
 */
async function getPool() {
  if (!pool) {
    // Dynamic import of pg
    const { Pool } = await import('pg');
    
    const connectionString = getEnv.postgresUrl();
    
    if (!connectionString) {
      throw new DatabaseError('POSTGRES_URL not configured', null);
    }

    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }

  return pool;
}

/**
 * UPSERT a user in the database
 * 
 * @param {Object} profile - User profile data
 * @param {string} profile.id - User ID (UUID from OAuth)
 * @param {string} profile.email - User email
 * @param {string} [profile.name] - User name
 * @param {string} [profile.image] - User avatar URL
 * @returns {Promise<Object>} The upserted user
 */
export async function upsertUser(profile) {
  try {
    const pool = await getPool();
    
    const query = `
      INSERT INTO users (id, email, name, image)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        image = COALESCE(EXCLUDED.image, users.image),
        updated_at = NOW()
      RETURNING id, email, name, image, created_at, updated_at
    `;

    const values = [
      profile.id,
      profile.email,
      profile.name || null,
      profile.image || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];

  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to upsert user', null, error);
  }
}

/**
 * Get user by ID
 * 
 * @param {string} id - User UUID
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserById(id) {
  try {
    const pool = await getPool();
    
    const query = `SELECT id, email, name, image, created_at, updated_at FROM users WHERE id = $1`;
    const result = await pool.query(query, [id]);
    
    return result.rows[0] || null;

  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to get user', null, error);
  }
}

/**
 * Get user by email
 * 
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserByEmail(email) {
  try {
    const pool = await getPool();
    
    const query = `SELECT id, email, name, image, created_at, updated_at FROM users WHERE email = $1`;
    const result = await pool.query(query, [email]);
    
    return result.rows[0] || null;

  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to get user by email', null, error);
  }
}

/**
 * Add fitting history entry
 * 
 * @param {Object} data - History entry data
 * @param {string} data.userId - User UUID
 * @param {string} data.resultUrl - URL of the result image
 * @param {string} data.blobPath - Blob storage path
 * @param {string} data.ratio - Output aspect ratio
 * @param {number} data.productCount - Number of products used
 * @returns {Promise<Object>} Created history entry
 */
export async function addHistory({ userId, resultUrl, blobPath, ratio, productCount }) {
  try {
    const pool = await getPool();
    
    const query = `
      INSERT INTO fitting_history (user_id, result_url, blob_path, ratio, product_count)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, result_url, blob_path, ratio, product_count, created_at
    `;

    const values = [userId, resultUrl, blobPath, ratio, productCount];
    const result = await pool.query(query, values);

    return result.rows[0];

  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to add history', null, error);
  }
}

/**
 * Get user fitting history
 * 
 * @param {string} userId - User UUID
 * @param {Object} options - Query options
 * @param {number} [options.limit=20] - Maximum results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<Object[]>} Array of history entries
 */
export async function getHistory(userId, options = {}) {
  try {
    const { limit = 20, offset = 0 } = options;
    const pool = await getPool();
    
    const query = `
      SELECT id, user_id, result_url, blob_path, ratio, product_count, created_at
      FROM fitting_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;

  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to get history', null, error);
  }
}

/**
 * Delete a history entry (with ownership check)
 * 
 * @param {string} historyId - History entry UUID
 * @param {string} userId - User UUID for ownership verification
 * @returns {Promise<void>}
 */
export async function deleteHistory(historyId, userId) {
  try {
    const pool = await getPool();
    
    const query = `
      DELETE FROM fitting_history
      WHERE id = $1 AND user_id = $2
    `;

    await pool.query(query, [historyId, userId]);

  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to delete history', null, error);
  }
}

/**
 * Get total history count for user
 * 
 * @param {string} userId - User UUID
 * @returns {Promise<number>} Total count
 */
export async function getHistoryCount(userId) {
  try {
    const pool = await getPool();
    const result = await pool.query(
      'SELECT COUNT(*) FROM fitting_history WHERE user_id = $1',
      [userId]
    );
    
    return parseInt(result.rows[0].count, 10);

  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError('Failed to get history count', null, error);
  }
}

/**
 * Close database pool
 * Should be called when function completes in serverless environment
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Export getPool for health checks
export { getPool };

// Export default
export default {
  upsertUser,
  getUserById,
  getUserByEmail,
  addHistory,
  getHistory,
  deleteHistory,
  getHistoryCount,
  getPool,
  closePool
};