/**
 * LIATDULU - Image Composite Utilities (Browser/Canvas Version)
 * 
 * Functions for creating composite images using HTML Canvas
 * Used for frontend preview and local processing
 */

import { GRID_CONFIG } from './constants.js';

/**
 * Create a composite image from multiple images arranged in a grid
 * 
 * @param {HTMLImageElement[]} images - Array of image elements to composite
 * @param {Object} options - Configuration options
 * @param {number} options.tileSize - Size of each tile in pixels (default: 512)
 * @returns {Promise<HTMLCanvasElement>} Canvas with composite image
 */
export async function createCompositeImage(images, options = {}) {
  const { tileSize = GRID_CONFIG.TILE_SIZE } = options;
  const count = images.length;

  if (count === 0) {
    throw new Error('No images provided');
  }

  const gridSize = GRID_CONFIG.GRID_SIZES[count] || GRID_CONFIG.GRID_SIZES[9];
  const { rows, cols } = gridSize;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;
  const ctx = canvas.getContext('2d');

  // Fill with transparent background
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw each image in grid position
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = col * tileSize;
    const y = row * tileSize;

    ctx.drawImage(images[i], x, y, tileSize, tileSize);
  }

  // Add model image as full canvas overlay (for fitting)
  // In the original implementation, model was the main image
  // and products were composited on top

  return canvas;
}

/**
 * Trim black bars from image
 * 
 * @param {HTMLImageElement} image - Image to trim
 * @returns {Promise<Blob>} Trimmed image as Blob
 */
export async function trimBlackBars(image) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Find bounding box of non-black pixels
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;

  const threshold = 10; // Allow slight darkness variation

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Check if pixel is not black (allowing for some tolerance)
      if (r > threshold || g > threshold || b > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // If no non-black pixels found, return original
  if (minX > maxX || minY > maxY) {
    return new Blob([], { type: 'image/png' });
  }

  // Crop to bounding box
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  return new Promise((resolve) => {
    croppedCanvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/**
 * Create a preview thumbnail of an image
 * 
 * @param {HTMLImageElement} image - Image to thumbnail
 * @param {number} maxLength - Maximum length in pixels (default: 512)
 * @returns {Promise<Blob>} Thumbnail as Blob
 */
export async function createThumbnail(image, maxLength = 512) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let { width, height } = image;
  const scale = Math.min(1, maxLength / Math.max(width, height));

  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
  });
}

/**
 * Resize image while maintaining aspect ratio
 * 
 * @param {HTMLImageElement} image - Original image
 * @param {Object} constraints - Max dimensions
 * @param {number} constraints.maxWidth - Maximum width
 * @param {number} constraints.maxHeight - Maximum height
 * @returns {Promise<Blob>} Resized image as Blob
 */
export async function resizeImage(image, constraints) {
  const { maxWidth, maxHeight } = constraints;

  let { width, height } = image;

  // Calculate scale to fit within constraints
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), image.type || 'image/jpeg', 0.92);
  });
}