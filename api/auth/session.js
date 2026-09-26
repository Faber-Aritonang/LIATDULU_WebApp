/**
 * LIATDULU - NextAuth Session Endpoint
 * 
 * GET /api/auth/session
 * 
 * Returns current session data
 */

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  url: process.env.NEXTAUTH_URL,
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id || user.email;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
      }
      return session;
    }
  }
};

export default NextAuth(authOptions);