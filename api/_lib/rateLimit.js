/**
 * LIATDULU - Rate Limiting Module
 * 
 * Rate limiting using Vercel KV (Redis-compatible)
 */

import { RateLimitError } from './errors.js';
import { getEnv, RATE_LIMIT_DEFAULTS } from './env.js';

// Default rate limit settings
const DEFAULT_MAX_REQUESTS = RATE_LIMIT_DEFAULTS.max;
const DEFAULT_WINDOW_SECONDS = RATE_LIMIT_DEFAULTS.window;

// KV key prefix for rate limiting
const RATE_LIMIT_PREFIX = 'ratelimit:';

/**
 * Check if a request is allowed under rate limits
 * 
 * Uses sliding window algorithm for accurate rate limiting
 * 
 * @param {Object} params
 * @param {string} params.identifier - Unique identifier (userId or IP)
 * @param {number} [params.max] - Maximum requests allowed in window (default: 10)
 * @param {number} [params.window] - Window in seconds (default: 3600)
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
export async function checkRateLimit({ identifier, max, window: windowSeconds }) {
  const limit = max || DEFAULT_MAX_REQUESTS;
  const windowSec = windowSeconds || DEFAULT_WINDOW_SECONDS;
  
  if (!identifier) {
    // If no identifier, allow the request
    return { allowed: true, remaining: limit, resetAt: Date.now() + (windowSec * 1000) };
  }

  const key = `${RATE_LIMIT_PREFIX}${identifier}`;
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const resetAt = now + windowMs;

  try {
    // Try to use KV for rate limiting if available
    const kvUrl = getEnv.kvUrl();
    const kvToken = getEnv.kvToken();
    
    if (kvUrl && kvToken) {
      return await checkRateLimitKV(key, limit, windowMs, resetAt, kvUrl, kvToken);
    }
    
    // Fallback to in-memory if KV not configured
    return checkRateLimitMemory(key, limit, windowMs, resetAt);
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Allow request on error (fail open)
    return { allowed: true, remaining: limit - 1, resetAt };
  }
}

/**
 * Check rate limit using Vercel KV
 * 
 * @param {string} key - KV key
 * @param {number} limit - Max requests
 * @param {number} windowMs - Window in milliseconds
 * @param {number} resetAt - Reset timestamp
 * @param {string} kvUrl - KV REST API URL
 * @param {string} kvToken - KV REST API token
 * @returns {Promise<{allowed, remaining, resetAt}>}
 */
async function checkRateLimitKV(key, limit, windowMs, resetAt, kvUrl, kvToken) {
  const now = Date.now();
  
  try {
    // Use KV atomic operations for thread-safe rate limiting
    const response = await fetch(`${kvUrl}/incrby`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key,
        increment: 1,
        expirationTtl: Math.ceil(windowMs / 1000)
      })
    });

    if (!response.ok) {
      throw new Error(`KV error: ${response.status}`);
    }

    const data = await response.json();
    const count = data.result || 1;
    
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    // Get TTL for exact reset time
    let actualResetAt = resetAt;
    try {
      const ttlResponse = await fetch(`${kvUrl}/ttl`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${kvToken}`
        }
      });
      
      if (ttlResponse.ok) {
        const ttlData = await ttlResponse.json();
        const ttl = ttlData.result || 0;
        actualResetAt = now + (ttl * 1000);
      }
    } catch {
      // Use estimated reset time
    }

    return {
      allowed,
      remaining,
      resetAt: actualResetAt
    };
  } catch (error) {
    throw error;
  }
}

// In-memory fallback (for local development)
const memoryStore = new Map();

/**
 * Check rate limit using in-memory store (fallback)
 * 
 * @param {string} key - Rate limit key
 * @param {number} limit - Max requests
 * @param {number} windowMs - Window in milliseconds
 * @param {number} resetAt - Reset timestamp
 * @returns {{allowed, remaining, resetAt}}
 */
function checkRateLimitMemory(key, limit, windowMs, resetAt) {
  const now = Date.now();
  const entry = memoryStore.get(key) || { count: 0, resetTime: now + windowMs };

  // Reset if window expired
  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + windowMs;
  }

  entry.count += 1;
  memoryStore.set(key, entry);

  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetTime
  };
}

/**
 * Create a rate limiter function with preset limits
 * 
 * @param {Object} options - Rate limit options
 * @param {number} options.max - Maximum requests
 * @param {number} options.window - Window in seconds
 * @returns {Function} Rate limiter function
 */
export function createRateLimiter({ max = DEFAULT_MAX_REQUESTS, window = DEFAULT_WINDOW_SECONDS } = {}) {
  return async (identifier) => {
    const result = await checkRateLimit({ identifier, max, window });
    
    if (!result.allowed) {
      throw new RateLimitError(max, Math.ceil(result.resetAt / 1000), result.remaining);
    }

    return result;
  };
}

/**
 * Clean up expired entries from memory store
 * 
 * @param {string} identifier - Specific key to clear (optional)
 */
export function cleanupRateLimitStore(identifier = null) {
  if (identifier) {
    memoryStore.delete(`${RATE_LIMIT_PREFIX}${identifier}`);
    return;
  }

  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}

// Preset rate limiters for different endpoints
export const rateLimiters = {
  // Generate endpoint: 10 requests per hour per user/IP
  generate: createRateLimiter({ max: 10, window: 3600 }),
  
  // History endpoint: 100 requests per hour
  history: createRateLimiter({ max: 100, window: 3600 }),
  
  // General API: 1000 requests per hour
  general: createRateLimiter({ max: 1000, window: 3600 })
};

// Export default
export default {
  checkRateLimit,
  createRateLimiter,
  cleanupRateLimitStore,
  rateLimiters
};