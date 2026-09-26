/**
 * LIATDULU - File Helper Utilities
 * 
 * Utility functions for handling file operations in the browser
 */

/**
 * Convert a File object to a base64 data URL
 * @param {File} file - File object from input or paste
 * @returns {Promise<string>} Base64 data URL (data:image/...;base64,...)
 * @throws {Error} If file cannot be read
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a data URL to a Blob object
 * @param {string} dataURL - Base64 data URL
 * @returns {Blob} Blob object
 */
export function dataURLToBlob(dataURL) {
  const parts = dataURL.split(',');
  const contentType = parts[0].match(/:(.*?);/)[1];
  const b64Data = parts[1];
  const binary = atob(b64Data);
  const arrayLength = binary.length;
  const uint8Array = new Uint8Array(arrayLength);

  for (let i = 0; i < arrayLength; i++) {
    uint8Array[i] = binary.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: contentType });
}

/**
 * Convert a Blob to a File object
 * @param {Blob} blob - Blob object
 * @param {string} filename - Desired filename
 * @returns {File} File object
 */
export function blobToFile(blob, filename) {
  return new File([blob], filename, { type: blob.type });
}

/**
 * Get file extension from File object
 * @param {File} file - File object
 * @returns {string} File extension (lowercase, without dot)
 */
export function getFileExtension(file) {
  return file.name.split('.').pop().toLowerCase();
}

/**
 * Check if file is a valid image type
 * @param {File} file - File object to check
 * @returns {boolean} True if file is a valid image
 */
export function isValidImageFile(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Human-readable size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(1)} ${units[i]}`;
}

/**
 * Create a preview URL for a File object
 * @param {File} file - File object
 * @returns {string} Object URL for preview
 */
export function createPreviewURL(file) {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free memory
 * @param {string} url - Object URL from createPreviewURL
 */
export function revokePreviewURL(url) {
  URL.revokeObjectURL(url);
}

/**
 * Compress image file using canvas
 * @param {File} file - Original file
 * @param {number} quality - Quality from 0 to 1 (default: 0.92)
 * @returns {Promise<File>} Compressed file
 */
export async function compressImage(file, quality = 0.92) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Limit dimensions
      const maxDimension = 2048;
      let { width, height } = img;

      if (width > height) {
        if (width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}