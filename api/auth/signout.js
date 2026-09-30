/**
 * LIATDULU - Sign out Endpoint
 *
 * POST /api/auth/signout
 *
 * Clears the session cookie.
 */

import { clearSessionOnResponse } from '../_lib/session.js';

export default async function handler(req, res) {
  clearSessionOnResponse(res);
  res.status(200).json({ success: true });
}
