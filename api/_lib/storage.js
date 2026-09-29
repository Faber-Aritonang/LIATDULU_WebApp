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
 * Save result image to Vercel Blob storage
 *
 * @param {string} base64DataURL - Base64 data URL of the image
 * @param {string} [userId] - Optional user ID for organizing files
 * @returns {Promise<{url: string, pathname: string}>} Object with URL and pathname
 * @throws {StorageError} If upload fails
 */
export async function saveResult(base64DataURL, userId) {
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

    // Get blob token
    const blobToken = getEnv.blobToken();

    if (!blobToken) {
      throw new StorageError('BLOB_READ_WRITE_TOKEN not configured', 'saveResult');
    }

    // Upload via official client
    const uploadResult = await put(pathname, buffer, {
      access: 'public',
      contentType: `image/${mimeType}`,
      addRandomSuffix: false,
      token: blobToken
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
 * @returns {Promise<void>}
 * @throws {StorageError} If deletion fails
 */
export async function deleteResult(pathnameOrUrl) {
  try {
    const blobToken = getEnv.blobToken();

    if (!blobToken) {
      throw new StorageError('BLOB_READ_WRITE_TOKEN not configured', 'deleteResult');
    }

    await del(pathnameOrUrl, { token: blobToken });

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
    const blobToken = getEnv.blobToken();

    if (!blobToken) {
      throw new StorageError('BLOB_READ_WRITE_TOKEN not configured', 'getSignedURL');
    }

    const meta = await head(pathname, { token: blobToken });

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
    const blobToken = getEnv.blobToken();

    if (!blobToken) return false;

    const meta = await head(pathname, { token: blobToken });

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
    const blobToken = getEnv.blobToken();

    if (!blobToken) {
      throw new StorageError('BLOB_READ_WRITE_TOKEN not configured', 'getFileInfo');
    }

    const meta = await head(pathname, { token: blobToken });

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
