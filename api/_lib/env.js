/**
 * LIATDULU - Environment Variables Configuration
 * 
 * Server-side environment variable access
 * Works with Vercel Functions and Node.js 20+
 */

/**
 * Environment variable accessors
 * These are accessed directly at runtime for Vercel Serverless Functions
 */
export const getEnv = {
  /** Get Bynara API key */
  bynaraApiKey: () => process.env.BYNARA_API_KEY,

  /** Get NextAuth secret */
  nextAuthSecret: () => process.env.NEXTAUTH_SECRET,

  /** Get NextAuth URL */
  nextAuthUrl: () => process.env.NEXTAUTH_URL,

  /** Get Google OAuth client ID */
  googleClientId: () => process.env.GOOGLE_CLIENT_ID,

  /** Get Google OAuth client secret */
  googleClientSecret: () => process.env.GOOGLE_CLIENT_SECRET,

  /** Get PostgreSQL connection URL */
  postgresUrl: () => process.env.POSTGRES_URL,

  /** Get Vercel KV REST API URL */
  kvUrl: () => process.env.KV_REST_API_URL,

  /** Get Vercel KV REST API token */
  kvToken: () => process.env.KV_REST_API_TOKEN,

  /** Get Vercel Blob read/write token */
  blobToken: () => process.env.BLOB_READ_WRITE_TOKEN
};

/**
 * Check if all required environment variables are set
 * 
 * @returns {{valid: boolean, missing: string[]}} Validation result
 */
export function validateEnv() {
  const required = [
    { name: 'BYNARA_API_KEY', value: process.env.BYNARA_API_KEY },
    { name: 'NEXTAUTH_SECRET', value: process.env.NEXTAUTH_SECRET }
  ];

  const missing = required
    .filter(({ value }) => !value)
    .map(({ name }) => name);

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Assert environment is properly configured
 * Throws error if required variables are missing
 * 
 * @param {string[]} required - List of required env var names
 * @throws {Error} If any required variable is missing
 */
export function assertEnv(required = []) {
  const missing = required.filter(name => !process.env[name]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get rate limiter defaults
 */
export const RATE_LIMIT_DEFAULTS = {
  max: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
  window: parseInt(process.env.RATE_LIMIT_WINDOW || '3600', 10)
};

/**
 * Get Blob storage configuration
 */
export const BLOB_CONFIG = {
  baseUrl: 'https://blob.vercel-storage.com',
  basePath: 'results'
};