/**
 * LIATDULU - Google Sign-in Endpoint
 *
 * GET /api/auth/signin/google?callbackUrl=...
 *
 * Redirects the browser to the Google OAuth consent screen.
 */

import { getGoogleAuthUrl } from '../../_lib/session.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const authUrl = getGoogleAuthUrl(req, url.searchParams.get('callbackUrl') || '/');

    if (!authUrl) {
      res.status(501).json({
        error: { code: 'NOT_CONFIGURED', message: 'Login Google belum dikonfigurasi di server.' },
      });
      return;
    }

    res.setHeader('Location', authUrl);
    res.status(302).end();
  } catch (error) {
    console.error('Google signin error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to start Google sign-in' },
    });
  }
}
