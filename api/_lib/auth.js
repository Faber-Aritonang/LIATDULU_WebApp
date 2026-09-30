/**
 * LIATDULU - Auth Helpers
 *
 * Session utilities backed by the self-contained JWT cookie session in
 * ./session.js. Previously used next-auth, which requires the Next.js
 * runtime and crashed on Vercel Functions (no `next` package).
 *
 * Session shape is unchanged: { user: { id, email, name, image }, expires }
 */

import { getSession as getSessionFromRequest } from './session.js';

/**
 * Get session data from the request's session cookie.
 *
 * @param {IncomingMessage} req - Request (cookie header is read from it)
 * @returns {Promise<{user: Object|null, expires: string}|null>}
 */
export async function getSession(req) {
  if (!req) return null;
  return getSessionFromRequest(req);
}

/**
 * Get current user from session
 *
 * @param {IncomingMessage} req - Request
 * @returns {Promise<Object|null>} User object or null
 */
export async function getCurrentUser(req) {
  const session = await getSession(req);
  return session?.user || null;
}

/**
 * Extract a session token from request headers.
 * Prefers the session cookie; falls back to an Authorization Bearer token.
 *
 * @param {IncomingMessage} req - Request
 * @returns {string|null}
 */
export function extractToken(req) {
  const headers = req.headers || {};
  const get = (name) => {
    if (typeof headers.get === 'function') return headers.get(name);
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };

  const cookieHeader = get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/liatdulu\.session-token=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  const authHeader = get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Create authenticated API handler wrapper
 *
 * @param {Function} handler - Handler function that receives req, res, user
 * @returns {Function} Wrapped handler
 */
export function withAuth(handler) {
  return async (req, res) => {
    try {
      const user = await getCurrentUser(req);

      if (!user) {
        res.status(401).json({
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        });
        return;
      }

      await handler(req, res, user);
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({
        error: { code: 'AUTH_ERROR', message: 'Authentication check failed' },
      });
    }
  };
}

/**
 * Check if the request carries a valid session
 *
 * @param {IncomingMessage} req - Request
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated(req) {
  const session = await getSession(req);
  return !!session?.user;
}
