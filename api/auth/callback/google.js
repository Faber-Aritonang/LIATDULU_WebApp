/**
 * LIATDULU - Google OAuth Callback Endpoint
 *
 * GET /api/auth/callback/google?code=...&state=...
 *
 * Exchanges the OAuth code for tokens, fetches the profile,
 * sets the session cookie, and redirects to the app.
 */

import {
  exchangeGoogleCode,
  parseOAuthState,
  setSessionOnResponse,
} from '../../_lib/session.js';

/**
 * Send a small HTML redirect page.
 * Location headers can be dropped in some OAuth flows; meta refresh is
 * the safe fallback.
 */
function htmlRedirect(res, url) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${url}"></head>` +
      `<body><a href="${url}">Melanjutkan…</a></body></html>`
  );
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const code = url.searchParams.get('code');
    const errorParam = url.searchParams.get('error');
    const { callbackUrl = '/' } = parseOAuthState(url.searchParams.get('state') || '');

    if (errorParam) {
      htmlRedirect(res, `/auth/error?error=${encodeURIComponent(errorParam)}`);
      return;
    }
    if (!code) {
      htmlRedirect(res, '/auth/error?error=Callback');
      return;
    }

    const { user } = await exchangeGoogleCode(req, code);
    await setSessionOnResponse(res, user);

    htmlRedirect(res, callbackUrl.startsWith('/') ? callbackUrl : '/');
  } catch (error) {
    console.error('Google callback error:', error);
    htmlRedirect(res, '/auth/error?error=Configuration');
  }
}
