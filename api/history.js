/**
 * LIATDULU - History GET Endpoint
 * 
 * GET /api/history
 * 
 * Returns user's fitting history
 */

import { getSession } from './_lib/auth.js';
import { getHistory, getHistoryCount } from './_lib/db.js';
import { AuthError } from './_lib/errors.js';
import { checkRateLimit, rateLimiters } from './_lib/rateLimit.js';

/**
 * Handler for GET /api/history
 */
export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
    return;
  }

  try {
    // Get session
    const session = await getSession(req);
    
    if (!session || !session.user) {
      res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
      return;
    }

    // Check rate limit
    const userId = session.user.id;
    await checkRateLimit({ identifier: userId, max: 100, window: 3600 });

    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Get history
    const history = await getHistory(userId, { limit, offset });
    const totalCount = await getHistoryCount(userId);

    // Return response
    res.status(200).json({
      success: true,
      data: history,
      meta: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + history.length < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    
    if (error.message === 'Authentication required') {
      res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
      return;
    }

    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch history' }
    });
  }
}