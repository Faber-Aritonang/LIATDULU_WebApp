/**
 * Custom Error Classes for LIATDULU Application
 * 
 * All errors extend AppError and provide structured error responses
 */

/**
 * Base application error class
 * Provides consistent error response structure across all API endpoints
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} code - Error code for programmatic handling
   * @param {Object} details - Additional error details
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to standardized API response
   * @returns {Object} Response object with error details
   */
  toResponse() {
    const response = {
      error: {
        code: this.code,
        message: this.message
      }
    };

    if (this.details) {
      response.error.details = this.details;
    }

    return response;
  }

  /**
   * Get HTTP status code for this error
   * @returns {number} HTTP status code
   */
  get status() {
    return this.statusCode;
  }
}

/**
 * Extract a human-readable message from a Bynara API error body.
 * Handles shapes like {message}, {error: "..."}, and
 * {error: {type, message}} — always returns a string.
 *
 * @param {Object} parsed - Parsed error body
 * @param {string} fallback - Default message if nothing usable found
 * @returns {string}
 */
function extractApiMessage(parsed, fallback) {
  if (typeof parsed?.message === 'string' && parsed.message) {
    return parsed.message;
  }
  const err = parsed?.error;
  if (typeof err === 'string' && err) {
    return err;
  }
  if (typeof err?.message === 'string' && err.message) {
    return err.message;
  }
  return fallback;
}

/**
 * Error thrown when Bynara API request fails
 */
export class BynaraAPIError extends AppError {
  /**
   * @param {number} status - HTTP status code from Bynara
   * @param {string|Object} body - Response body from Bynara
   * @param {string} requestId - Optional request ID for debugging
   */
  constructor(status, body, requestId = null) {
    let message = 'Gagal memproses gambar di Bynara API';
    let details = null;

    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        message = extractApiMessage(parsed, message);
        details = { ...parsed, requestId };
      } catch {
        details = { body, requestId };
        message = body || message;
      }
    } else if (body && typeof body === 'object') {
      message = extractApiMessage(body, message);
      details = { ...body, requestId };
    }

    super(message, status, 'BYNARA_API_ERROR', details);
    this.requestId = requestId;
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  /**
   * @param {number} max - Maximum allowed requests
   * @param {number} resetAt - Unix timestamp when limit resets
   * @param {number} remaining - Remaining requests in current window
   */
  constructor(max, resetAt, remaining = 0) {
    const message = `Rate limit exceeded. Max ${max} requests per hour.`;
    super(
      message,
      429,
      'RATE_LIMIT_EXCEEDED',
      { max, resetAt, remaining, retryAfter: Math.ceil((resetAt - Date.now() / 1000) / 60) }
    );
    this.max = max;
    this.resetAt = resetAt;
    this.remaining = remaining;
  }

  /**
   * Get remaining time until rate limit resets in seconds
   * @returns {number} Seconds until reset
   */
  get secondsUntilReset() {
    return Math.max(0, Math.ceil((this.resetAt - Date.now() / 1000)));
  }
}

/**
 * Error thrown when user is not authenticated
 */
export class AuthError extends AppError {
  /**
   * @param {string} message - Error message (default: authentication required)
   */
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
  }
}

/**
 * Error thrown for permission denied (authenticated but not authorized)
 */
export class PermissionError extends AppError {
  /**
   * @param {string} message - Error message
   */
  constructor(message = 'Permission denied') {
    super(message, 403, 'PERMISSION_DENIED');
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends AppError {
  /**
   * @param {string} field - Field name that failed validation
   * @param {string} message - Validation error message
   */
  constructor(field, message) {
    super(message, 400, 'VALIDATION_ERROR', { field });
    this.field = field;
  }
}

/**
 * Error thrown when file validation fails
 */
export class FileValidationError extends AppError {
  /**
   * @param {string} filename - Name of the invalid file
   * @param {string} reason - Reason why file is invalid
   */
  constructor(filename, reason) {
    super(`File validation failed: ${filename} - ${reason}`, 400, 'FILE_VALIDATION_ERROR', {
      filename,
      reason
    });
    this.filename = filename;
    this.reason = reason;
  }
}

/**
 * Error thrown when storage operations fail
 */
export class StorageError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {string} operation - Storage operation that failed (upload, delete, etc.)
   * @param {Error} [cause] - Original error that caused this error
   */
  constructor(message, operation, cause = null) {
    super(message, 500, 'STORAGE_ERROR', cause ? { operation, cause: cause.message } : { operation });
    this.operation = operation;
    this.cause = cause;
  }
}

/**
 * Error thrown for database operations
 */
export class DatabaseError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {string} query - SQL query that failed (sanitized)
   * @param {Error} [cause] - Original error that caused this error
   */
  constructor(message, query = null, cause = null) {
    super(message, 500, 'DATABASE_ERROR', {
      query: query ? 'SQL query failed' : null,
      cause: cause?.message
    });
    this.query = query;
    this.cause = cause;
  }
}

/**
 * Error thrown for network operations
 */
export class NetworkError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Error} [cause] - Original error that caused this error
   */
  constructor(message, cause = null) {
    super(message, 502, 'NETWORK_ERROR', cause ? { cause: cause.message } : null);
    this.cause = cause;
  }
}

/**
 * Helper function to handle errors in API handlers
 * Converts any error to appropriate AppError if needed
 * @param {Error} err - Error to handle
 * @returns {AppError} Proper AppError instance
 */
export function normalizeError(err) {
  if (err instanceof AppError) {
    return err;
  }

  // Convert unknown errors to AppError
  if (err.code === 'ENOENT') {
    return new ValidationError('file', 'File not found');
  }

  if (err.code === 'EACCES') {
    return new PermissionError('Access denied to resource');
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return new NetworkError(`Network error: ${err.message}`);
  }

  return new AppError(err.message || 'An unexpected error occurred', 500, 'UNEXPECTRED_ERROR');
}

/**
 * Helper to send error response
 * @param {Object} res - Express/Vercel response object
 * @param {AppError} error - Error to send
 */
export function sendErrorResponse(res, error) {
  const normalizedError = normalizeError(error);
  const { toResponse } = normalizedError;

  res.status(normalizedError.statusCode).json(toResponse());
}