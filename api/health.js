/**
 * LIATDULU - Health Check Endpoint
 *
 * GET /api/health
 *
 * Returns system health status including:
 * - Bynara API connectivity
 * - Database connectivity
 * - Environment configuration
 */

import { checkBynaraHealth } from './_lib/bynara.js';
import { validateEnv } from './_lib/env.js';

/**
 * Handler for GET /api/health
 */
export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
    });
    return;
  }

  const startTime = Date.now();
  const checks = {};
  let overallHealthy = true;

  // 1. Check environment variables
  const envCheck = validateEnv();
  checks.environment = {
    healthy: envCheck.valid,
    missing: envCheck.missing
  };
  if (!envCheck.valid) overallHealthy = false;

  // 2. Check Bynara API
  try {
    const bynaraResult = await checkBynaraHealth();
    checks.bynara = {
      healthy: bynaraResult.healthy,
      responseTime: bynaraResult.responseTime,
      error: bynaraResult.error
    };
    if (!bynaraResult.healthy) overallHealthy = false;
  } catch (error) {
    checks.bynara = {
      healthy: false,
      error: error.message
    };
    overallHealthy = false;
  }

  // 3. Check database (if configured)
  if (process.env.POSTGRES_URL) {
    try {
      const { getPool } = await import('./_lib/db.js');
      const pool = await getPool();
      const result = await pool.query('SELECT 1');
      checks.database = {
        healthy: result.rows.length > 0,
        connected: true
      };
    } catch (error) {
      checks.database = {
        healthy: false,
        connected: false,
        error: error.message
      };
      overallHealthy = false;
    }
  } else {
    checks.database = {
      healthy: true,
      connected: false,
      note: 'POSTGRES_URL not configured'
    };
  }

  // 4. Check KV (if configured)
  if (process.env.KV_REST_API_URL) {
    checks.kv = {
      healthy: true,
      configured: true
    };
  } else {
    checks.kv = {
      healthy: true,
      configured: false,
      note: 'KV_REST_API_URL not configured, using in-memory rate limiting'
    };
  }

  const responseTime = Date.now() - startTime;

  // Return health status
  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    responseTime,
    version: '1.0.0',
    checks
  });
}
