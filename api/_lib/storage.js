/**
 * LIATDULU - Storage Module
 *
 * Wraps Vercel Blob storage (official @vercel/blob client) for saving
 * and retrieving fitting results
 */

import { put, del, head } from '@vercel/blob';
import { StorageError } from './errors.js';
import { getEnv, BLOB_CONFIG } from './env.js';

// Blob storage base path
const BLOB_BASE_PATH = BLOB_CONFIG.basePath;

/**
 * Resolve @vercel/blob auth options (client v2).
 *
 * Prefers the classic BLOB_READ_WRITE_TOKEN. Otherwise uses OIDC auth:
 * BLOB_STORE_ID (available as project env) + an OIDC token — either the
 * per-request `x-vercel-oidc-token` header or the auto-refreshing token
 * from @vercel/oidc.
 *
 * @param {string} [oidcToken] - Per-request Vercel OIDC token
 * @returns {{token: string}|{storeId: string, oidcToken?: string}}
 * @throws {StorageError} If no credential is available
 */
function getBlobAuth(oidcToken) {
  const token = getEnv.blobToken();
  if (token) {
    return { token };
  }

  const storeId = process.env.BLOB_STORE_ID;
  if (storeId) {
    const resolved = oidcToken || process.env.VERCEL_OIDC_TOKEN;
    return resolved
      ? { storeId, oidcToken: resolved }
      : { storeId };
  }

  throw new StorageError(
    'Neither BLOB_READ_WRITE_TOKEN nor BLOB_STORE_ID is configured',
    'blobAuth'
  );
}

/**
 * Save result image to Vercel Blob storage
 *
 * @param {string} base64DataURL - Base64 data URL of the image
 * @param {string} [userId] - Optional user ID for organizing files
 * @param {string} [oidcToken] - Per-request Vercel OIDC token
 * @returns {Promise<{url: string, pathname: string}>} Object with URL and pathname
 * @throws {StorageError} If upload fails
 */
export async function saveResult(base64DataURL, userId, oidcToken) {
  try {
    // Extract base64 data
    const match = base64DataURL.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      throw new StorageError('Invalid base64 data URL', 'saveResult');
    }

    const [_, mimeType, base64Data] = match;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const timestamp = Date.now();
    const prefix = userId ? `${userId}/${timestamp}` : `${timestamp}`;
    const pathname = `${BLOB_BASE_PATH}/${prefix}.png`;

    // Upload via official client (token or OIDC storeId)
    const uploadResult = await put(pathname, buffer, {
      access: 'public',
      contentType: `image/${mimeType}`,
      addRandomSuffix: false,
      ...getBlobAuth(oidcToken)
    });

    return {
      url: uploadResult.url,
      pathname: uploadResult.pathname || pathname
    };

  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(`Failed to save result: ${error.message}`, 'saveResult', error);
  }
}

/**
 * Delete a file from Vercel Blob storage
 *
 * @param {string} pathnameOrUrl - Path/name or full URL of the file to delete
 * @param {string} [oidcToken] - Per-request Vercel OIDC token
 * @returns {Promise<void>}
 * @throws {StorageError} If deletion fails
 */
export async function deleteResult(pathnameOrUrl, oidcToken) {
  try {
    await del(pathnameOrUrl, getBlobAuth(oidcToken));
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(`Failed to delete result: ${error.message}`, 'deleteResult', error);
  }
}

/**
 * Get a URL for a Blob file (files are public, so this resolves the
 * permanent public URL for the given pathname)
 *
 * @param {string} pathname - Path/name of the file
 * @param {number} [_expiresIn] - Unused (kept for API compatibility)
 * @returns {Promise<string>} Public URL
 * @throws {StorageError} If file not found
 */
export async function getSignedURL(pathname, _expiresIn = 3600) {
  try {
    const meta = await head(pathname, getBlobAuth());

    if (!meta) {
      throw new StorageError('File not found', 'getSignedURL');
    }

    return meta.url;

  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(`Failed to get signed URL: ${error.message}`, 'getSignedURL', error);
  }
}

/**
 * Check if a file exists in storage
 *
 * @param {string} pathname - Path/name of the file
 * @returns {Promise<boolean>} True if file exists
 */
export async function fileExists(pathname) {
  try {
    const meta = await head(pathname, getBlobAuth());

    return Boolean(meta);
  } catch {
    return false;
  }
}

/**
 * Get file metadata from Blob storage
 *
 * @param {string} pathname - Path/name of the file
 * @returns {Promise<{size: number, contentType: string, lastModified: Date}>}
 */
export async function getFileInfo(pathname) {
  try {
    const meta = await head(pathname, getBlobAuth());

    if (!meta) {
      throw new StorageError('File not found', 'getFileInfo');
    }

    return {
      size: meta.size || 0,
      contentType: meta.contentType || 'application/octet-stream',
      lastModified: meta.uploadedAt ? new Date(meta.uploadedAt) : new Date()
    };
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(`Failed to get file info: ${error.message}`, 'getFileInfo', error);
  }
}

// Export default
export default {
  saveResult,
  deleteResult,
  getSignedURL,
  fileExists,
  getFileInfo
};
