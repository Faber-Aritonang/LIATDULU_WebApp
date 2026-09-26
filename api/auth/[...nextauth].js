/**
 * LIATDULU - NextAuth Handler
 * 
 * Handles Google OAuth and Email Magic Link authentication
 */

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Email from 'next-auth/providers/email';

/**
 * NextAuth configuration
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
    jwt: async ({ token, user, account }) => {
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
    /**
     * Handle successful sign-in
     */
    signIn: async ({ message, token }) => {
      console.log('User signed in:', token.email);
    },
    /**
     * Handle session creation
     */
    createUser: async ({ user }) => {
      console.log('New user created:', user.email);
    }
  }
};

export default NextAuth(authOptions);