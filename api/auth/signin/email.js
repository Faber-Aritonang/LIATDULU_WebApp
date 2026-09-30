/**
 * LIATDULU - Email Magic Link Endpoint (not implemented)
 *
 * GET|POST /api/auth/signin/email
 *
 * Magic-link sign-in requires an SMTP server (EMAIL_SERVER_* env vars),
 * which is not configured. Returns a clear 501 so the frontend can show
 * a helpful message instead of crashing.
 */

export default async function handler(req, res) {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Login via email (magic link) belum tersedia. Gunakan login Google.',
    },
  });
}
