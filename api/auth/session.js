/**
 * LIATDULU - NextAuth Session Endpoint
 *
 * GET /api/auth/session
 *
 * Returns current session data from the JWT session cookie.
 */

import { getSession } from '../_lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
    return;
  }

  try {
    const session = await getSession(req);
    res.status(200).json(session || {});
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to read session' },
    });
  }
}
