/**
 * LIATDULU - Auth Helpers
 * 
 * Authentication utilities for NextAuth.js integration
 */

/**
 * Get session data from NextAuth
 * 
 * @param {Object} [] - Optional options
 * @returns {Promise<{user: Object|null, expires: string}>}
 */
export async function getSession() {
  // In Vercel Functions, we need to import dynamically
  const { getServerSession } = await import('next-auth');
  const authOptions = {
    providers: [],
    secret: process.env.NEXTAUTH_SECRET
  };
  
  return await getServerSession(authOptions);
}

/**
 * Get current user from request
 * 
 * @param {Request} req - Incoming request
 * @returns {Promise<Object|null>} User object or null
 */
export async function getCurrentUser(req) {
  const session = await getSessionFromRequest(req);
  return session?.user || null;
}

/**
 * Get session from request headers
 * 
 * @param {Request} req - Incoming request
 * @returns {Promise<Object|null>} Session object or null
 */
export async function getSessionFromRequest(req) {
  try {
    const token = extractToken(req);
    
    if (!token) return null;
    
    // Verify JWT token (NextAuth uses JWT by default)
    // In production, you'd verify the token cryptographically
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    if (payload.exp < Date.now() / 1000) {
      return null; // Token expired
    }
    
    return {
      user: payload,
      expires: new Date(payload.exp * 1000).toISOString()
    };
  } catch (error) {
    console.error('Session parsing error:', error);
    return null;
  }
}

/**
 * Extract JWT token from request
 * 
 * @param {Request} req - Incoming request
 * @returns {string|null} JWT token or null
 */
export function extractToken(req) {
  // Check Authorization header
  const authHeader = req.headers.get?.('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const cookieHeader = req.headers.get?.('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/next-auth\.session-token=([^;]+)/);
    if (match) {
      return match[1];
    }
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
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' }
        });
        return;
      }

      await handler(req, res, user);

    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({
        error: { code: 'AUTH_ERROR', message: 'Authentication check failed' }
      });
    }
  };
}

/**
 * Check if user is authenticated
 * 
 * @param {Request} req - Incoming request
 * @returns {Promise<boolean>} True if authenticated
 */
export async function isAuthenticated(req) {
  const session = await getSessionFromRequest(req);
  return session !== null && session.user !== null;
}

/**
 * Require authentication and get user ID
 * 
 * @param {Request} req - Incoming request
 * @returns {Promise<string>} User ID or throws auth error
 */
export async function requireAuth(req) {
  const user = await getCurrentUser(req);
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user.id;
}