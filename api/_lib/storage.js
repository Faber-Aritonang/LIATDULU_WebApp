/**
 * LIATDULU - Storage Module
 * 
 * Wraps Vercel Blob storage for saving and retrieving fitting results
 */

import { StorageError } from './errors.js';
import { getEnv, BLOB_CONFIG } from './env.js';

// Blob storage base path
const BLOB_BASE_PATH = BLOB_CONFIG.basePath;
const blobBaseUrl = BLOB_CONFIG.baseUrl;

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
    const blobToken = getEnv().blobToken();

    // Upload to Vercel Blob
    if (!blobToken) {
      throw new StorageError('BLOB_READ_WRITE_TOKEN not configured', 'saveResult');
    }

    const response = await fetch(blobBaseUrl + '/' + encodeURIComponent(pathname), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${blobToken}`,
        'Content-Type': mimeType
      },
      body: buffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new StorageError(
        `Failed to upload to Blob: ${response.status} ${errorText}`,
        'saveResult'
      );
    }

    const uploadResult = await response.json();

    return {
      url: uploadResult.url || `${blobBaseUrl}/${pathname}`,
      pathname
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
 * @param {string} pathname - Path/name of the file to delete
 * @returns {Promise<void>}
 * @throws {StorageError} If deletion fails
 */
export async function deleteResult(pathname) {
  try {
    const blobToken = getEnv().blobToken();

    if (!blobToken) {
      throw new StorageError('BLOB_READ_WRITE_TOKEN not configured', 'deleteResult');
    }

    const response = await fetch(
      blobBaseUrl + '/' + encodeURIComponent(pathname),
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${blobToken}`
        }
      }
    );

    if (!response.ok) {
      throw new StorageError(
        `Failed to delete from Blob: ${response.status}`,
        'deleteResult'
      );
    }

  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(`Failed to delete result: ${error.message}`, 'deleteResult', error);
  }
}

/**
 * Get a signed URL for a Blob file
 * 
 * @param {string} pathname - Path/name of the file
 * @param {number} [expiresIn] - Expiration time in seconds (default: 3600)
 * @returns {Promise<string>} Signed URL
 * @throws {StorageError} If URL generation fails
 */
export async function getSignedURL(pathname, expiresIn = 3600) {
  try {
    const blobToken = getEnv().blobToken();

    if (!blobToken) {
      throw new StorageError('BLOB_READ_WRITE_TOKEN not configured', 'getSignedURL');
    }

    // Vercel Blob doesn't have built-in signed URLs in the same way as S3
    // We'll return the public URL directly
    // For private files, you'd need to implement additional auth checks

    const response = await fetch(
      blobBaseUrl + '/' + encodeURIComponent(pathname),
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${blobToken}`
        }
      }
    );

    if (!response.ok) {
      throw new StorageError(
        `Failed to get file from Blob: ${response.status}`,
        'getSignedURL'
      );
    }

    return `${blobBaseUrl}/${pathname}`;

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
    const blobToken = getEnv().blobToken();

    if (!blobToken) return false;

    const response = await fetch(
      blobBaseUrl + '/' + encodeURIComponent(pathname),
      {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${blobToken}`
        }
      }
    );

    return response.ok;
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
    const blobToken = getEnv().blobToken();

    if (!blobToken) {
      throw new StorageError('BLOB_READ_WRITE_TOKEN not configured', 'getFileInfo');
    }

    const response = await fetch(
      blobBaseUrl + '/' + encodeURIComponent(pathname),
      {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${blobToken}`
        }
      }
    );

    if (!response.ok) {
      throw new StorageError('File not found', 'getFileInfo');
    }

    return {
      size: parseInt(response.headers.get('content-length') || '0', 10),
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      lastModified: new Date(response.headers.get('last-modified') || Date.now())
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