/**
 * LIATDULU - NextAuth Handler
 *
 * Handles Google OAuth and Email Magic Link authentication
 * Imports config from shared auth module
 */

import NextAuth from 'next-auth';
import { authOptions } from '../_lib/auth.js';

export default NextAuth(authOptions);
