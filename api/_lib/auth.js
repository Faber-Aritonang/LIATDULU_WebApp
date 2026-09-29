/**
 * LIATDULU - Auth Helpers
 *
 * Authentication utilities for NextAuth.js integration
 * Single source of truth for auth configuration
 */

import Google from 'next-auth/providers/google';
import Email from 'next-auth/providers/email';

/**
 * NextAuth configuration - single source of truth
 *
 * Supports:
 * - Google OAuth
 * - Email Magic Link
 */
export const authOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Email({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587', 10),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD
        }
      },
      from: process.env.EMAIL_FROM
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  url: process.env.NEXTAUTH_URL,
  callbacks: {
    /**
     * Generate session token
     */
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    /**
     * Transform session
     */
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  events: {
    signIn: async ({ token }) => {
      console.log('User signed in:', token.email);
    },
    createUser: async ({ user }) => {
      console.log('New user created:', user.email);
    }
  }
};

/**
 * Get session data from NextAuth
 *
 * @returns {Promise<{user: Object|null, expires: string}>}
 */
export async function getSession() {
  const { getServerSession } = await import('next-auth');
  return await getServerSession(authOptions);
}

/**
 * Get current user from session
 *
 * @returns {Promise<Object|null>} User object or null
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Extract JWT token from request
 *
 * @param {Request} req - Incoming request
 * @returns {string|null} JWT token or null
 */
export function extractToken(req) {
  const authHeader = req.headers.get?.('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

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
 * Get session from request headers (for manual JWT parsing)
 *
 * @param {Request} req - Incoming request
 * @returns {Promise<Object|null>} Session object or null
 */
export async function getSessionFromRequest(req) {
  try {
    const token = extractToken(req);

    if (!token) return null;

    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    if (payload.exp < Date.now() / 1000) {
      return null;
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
 * Create authenticated API handler wrapper
 *
 * @param {Function} handler - Handler function that receives req, res, user
 * @returns {Function} Wrapped handler
 */
export function withAuth(handler) {
  return async (req, res) => {
    try {
      const user = await getCurrentUser();

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
 * @returns {Promise<boolean>} True if authenticated
 */
export async function isAuthenticated() {
  const session = await getSession();
  return session !== null && session.user !== null;
}

/**
 * Require authentication and get user ID
 *
 * @returns {Promise<string>} User ID or throws auth error
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user.id;
}
