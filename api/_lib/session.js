/**
 * LIATDULU - Self-contained Session & OAuth Helpers
 *
 * Replaces next-auth (which requires the Next.js runtime and crashes on
 * Vercel Functions with `ERR_MODULE_NOT_FOUND: next/server`).
 *
 * Implements:
 * - JWT session cookie signed with NEXTAUTH_SECRET (HS256 via `jose`)
 * - Google OAuth 2.0 authorization-code flow
 * - Compatible session shape: { user: { id, email, name, image }, expires }
 *
 * Env vars:
 * - NEXTAUTH_SECRET        (required) JWT signing secret
 * - NEXTAUTH_URL           (optional) base URL, defaults to request origin
 * - GOOGLE_CLIENT_ID       (required for Google sign-in)
 * - GOOGLE_CLIENT_SECRET   (required for Google sign-in)
 */

import { SignJWT, jwtVerify } from 'jose';

// ---------- Configuration ----------

const SESSION_COOKIE_NAME = 'liatdulu.session-token';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

// ---------- Secret & keys ----------

let cachedKey = null;
let cachedSecretRaw = null;

/**
 * Get the JWT signing key derived from NEXTAUTH_SECRET.
 * @returns {Uint8Array}
 */
function getSigningKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not configured');
  }
  if (!cachedKey || cachedSecretRaw !== secret) {
    cachedKey = new TextEncoder().encode(secret);
    cachedSecretRaw = secret;
  }
  return cachedKey;
}

/**
 * Resolve the app origin for OAuth redirects.
 * Prefers NEXTAUTH_URL, falls back to the request origin.
 */
function getOrigin(req) {
  if (process.env.NEXTAUTH_URL) {
    return String(process.env.NEXTAUTH_URL).replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

/**
 * Read a cookie value from the request headers (Node IncomingMessage).
 * @param {IncomingMessage} req
 * @param {string} name
 * @returns {string|null}
 */
export function readCookie(req, name) {
  const header = req.headers?.cookie;
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------- JWT session ----------

/**
 * Sign a session JWT for a user.
 * @param {{id?: string, email?: string, name?: string, image?: string, sub?: string}} user
 * @returns {Promise<string>}
 */
export async function signSessionToken(user) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    id: user.id || user.sub || null,
    email: user.email || null,
    name: user.name || null,
    picture: user.image || user.picture || null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MAX_AGE_SECONDS)
    .setSubject(user.id || user.sub || user.email || 'user')
    .sign(getSigningKey());
}

/**
 * Verify a session JWT and return its payload.
 * @param {string} token
 * @returns {Promise<Object|null>} payload or null if invalid/expired
 */
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ['HS256'],
    });
    return payload;
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return null;
  }
}

/**
 * Build the Set-Cookie header value for a session.
 * @param {string} token
 * @param {boolean} clear - when true, issues an expired cookie to sign out
 * @returns {string}
 */
export function buildSessionCookie(token, { clear = false } = {}) {
  const maxAge = clear ? 0 : SESSION_MAX_AGE_SECONDS;
  const parts = [
    `${SESSION_COOKIE_NAME}=${clear ? '' : encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

/**
 * Get the current session from the request cookie.
 * Compatible with the old next-auth shape: { user, expires } | null
 *
 * @param {IncomingMessage} req
 * @returns {Promise<{user: Object, expires: string}|null>}
 */
export async function getSession(req) {
  const token = readCookie(req, SESSION_COOKIE_NAME);
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return {
    user: {
      id: payload.id || payload.sub || null,
      email: payload.email || null,
      name: payload.name || null,
      image: payload.picture || null,
    },
    expires: typeof payload.exp === 'number' ? new Date(payload.exp * 1000).toISOString() : null,
  };
}

/**
 * Sign in (issue Set-Cookie) for a user on the response.
 * @param {Object} res - Node/Express-style response
 * @param {{id, email, name, image}} user
 */
export async function setSessionOnResponse(res, user) {
  const token = await signSessionToken(user);
  res.setHeader('Set-Cookie', buildSessionCookie(token));
  return token;
}

/** Clear the session cookie on the response. */
export function clearSessionOnResponse(res) {
  res.setHeader('Set-Cookie', buildSessionCookie('', { clear: true }));
}

// ---------- Google OAuth ----------

/**
 * Build the Google OAuth consent URL.
 * @param {IncomingMessage} req
 * @param {string} [callbackUrl] - where to send the user after success
 * @returns {string|null} null if Google is not configured
 */
export function getGoogleAuthUrl(req, callbackUrl = '/') {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  const origin = getOrigin(req);
  const redirectUri = `${origin}/api/auth/callback/google`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: Buffer.from(JSON.stringify({ callbackUrl })).toString('base64url'),
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchange the OAuth code for tokens and fetch the Google profile.
 * @param {IncomingMessage} req
 * @param {string} code
 * @returns {Promise<{user: Object, callbackUrl: string}>}
 */
export async function exchangeGoogleCode(req, code) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured');
  }

  const origin = getOrigin(req);
  const redirectUri = `${origin}/api/auth/callback/google`;

  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`Google token exchange failed (${tokenResponse.status}): ${body.slice(0, 300)}`);
  }

  const tokens = await tokenResponse.json();

  const userInfoResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoResponse.ok) {
    throw new Error(`Google userinfo failed (${userInfoResponse.status})`);
  }

  const profile = await userInfoResponse.json();

  return {
    user: {
      id: profile.sub || profile.email,
      email: profile.email || null,
      name: profile.name || null,
      image: profile.picture || null,
    },
    callbackUrl: '/',
  };
}

/**
 * Decode an OAuth `state` parameter.
 * @param {string} state
 * @returns {{callbackUrl: string}}
 */
export function parseOAuthState(state) {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString()) || {};
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return {};
  }
}
