/**
 * LIATDULU - Trim Black Bars Utility (Frontend)
 * 
 * This module provides browser-side utilities for trimming black bars
 * from generated images. For server-side processing, see
 * api/_lib/imageProcessor.js (which uses sharp)
 */

/**
 * Trim black bars from an image canvas
 * 
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @returns {Promise<{dataURL: string, width: number, height: number}>} Trimmed image data
 */
export async function trimBlackBarsFromCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Find bounding box of non-black pixels
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;

  const threshold = 15; // Allow slight darkness variation

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Check if pixel is not black
      if (r > threshold || g > threshold || b > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // Add small padding
  const padding = 10;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(canvas.width - 1, maxX + padding);
  maxY = Math.min(canvas.height - 1, maxY + padding);

  // If no non-black pixels found, return original
  if (minX >= maxX || minY >= maxY) {
    return {
      dataURL: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height
    };
  }

  // Create trimmed canvas
  const trimmedWidth = maxX - minX;
  const trimmedHeight = maxY - minY;
  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;
  const trimmedCtx = trimmedCanvas.getContext('2d');

  // Draw trimmed portion
  trimmedCtx.drawImage(
    canvas,
    minX, minY, maxX - minX, maxY - minY,
    0, 0, trimmedWidth, trimmedHeight
  );

  return {
    dataURL: trimmedCanvas.toDataURL('image/png'),
    width: trimmedWidth,
    height: trimmedHeight
  };
}

/**
 * Trim black bars from an image URL
 * 
 * @param {string} imageUrl - URL or data URL of the image
 * @returns {Promise<{dataURL: string, width: number, height: number}>}
 */
export async function trimBlackBarsFromImage(imageUrl) {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      trimBlackBarsFromCanvas(canvas)
        .then(resolve)
        .catch(reject);
    };

    img.onerror = (error) => reject(error);
    img.src = imageUrl;
  });
}

/**
 * Calculate bounding box of non-black content in image data
 * 
 * @param {ImageData} imageData - Image data from canvas
 * @param {number} threshold - RGB threshold for non-black detection
 * @returns {{minX, minY, maxX, maxY, width, height}} Bounding box dimensions
 */
export function calcBoundingBox(imageData, threshold = 15) {
  const data = imageData.data;
  const { width, height } = imageData;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (r > threshold || g > threshold || b > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return {
    minX,
    minY,
    maxX: Math.max(maxX, minX),
    maxY: Math.max(maxY, minY),
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}