/**
 * LIATDULU - NextAuth Session Endpoint
 *
 * GET /api/auth/session
 *
 * Returns current session data
 * Imports config from shared auth module
 */

import NextAuth from 'next-auth';
import { authOptions } from '../_lib/auth.js';

export default NextAuth(authOptions);
