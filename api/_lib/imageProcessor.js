/**
 * LIATDULU - Image Processor (Server-side with Sharp)
 * 
 * Server-side image processing using Sharp library for Vercel Functions
 */

import sharp from 'sharp';
import { GRID_CONFIG, IMAGE_CONSTRAINTS } from './constants.js';

/**
 * @typedef {Object} ImageInfo
 * @property {boolean} valid
 * @property {number} width
 * @property {number} height
 * @property {string} format
 * @property {string} [error]
 */

/**
 * Validate an image buffer
 * 
 * @param {Buffer} buffer - Image buffer to validate
 * @returns {Promise<ImageInfo>} Validation result
 */
export async function validateImageBuffer(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const format = metadata.format || 'unknown';
    
    // Check file size (buffer length)
    const fileSize = buffer.length;
    
    if (fileSize > IMAGE_CONSTRAINTS.MAX_FILE_SIZE) {
      return {
        valid: false,
        width,
        height,
        format,
        error: `File size (${(fileSize / 1024 / 1024).toFixed(1)}MB) exceeds maximum (${(IMAGE_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB)`
      };
    }

    // Check dimensions
    if (width < IMAGE_CONSTRAINTS.MIN_WIDTH || height < IMAGE_CONSTRAINTS.MIN_HEIGHT) {
      return {
        valid: false,
        width,
        height,
        format,
        error: `Image too small (${width}x${height}). Minimum: ${IMAGE_CONSTRAINTS.MIN_WIDTH}x${IMAGE_CONSTRAINTS.MIN_HEIGHT}`
      };
    }

    if (width > IMAGE_CONSTRAINTS.MAX_WIDTH || height > IMAGE_CONSTRAINTS.MAX_HEIGHT) {
      return {
        valid: false,
        width,
        height,
        format,
        error: `Image too large (${width}x${height}). Maximum: ${IMAGE_CONSTRAINTS.MAX_WIDTH}x${IMAGE_CONSTRAINTS.MAX_HEIGHT}`
      };
    }

    // Check format
    const validFormats = ['jpeg', 'jpg', 'png', 'webp'];
    if (!validFormats.includes(format.toLowerCase())) {
      return {
        valid: false,
        width,
        height,
        format,
        error: `Invalid format: ${format}. Supported: ${validFormats.join(', ')}`
      };
    }

    return { valid: true, width, height, format };
  } catch (error) {
    return {
      valid: false,
      width: 0,
      height: 0,
      format: 'unknown',
      error: `Failed to read image: ${error.message}`
    };
  }
}

/**
 * Create a composite image from multiple image buffers
 * Arranges images in a grid for sending to Bynara API
 * 
 * @param {Buffer[]} imageBuffers - Array of image buffers
 * @param {Object} options - Configuration options
 * @returns {Promise<Buffer>} Composite JPEG buffer
 */
export async function createCompositeImage(imageBuffers, options = {}) {
  const { tileSize = GRID_CONFIG.TILE_SIZE } = options;
  const count = imageBuffers.length;

  if (count === 0) {
    throw new Error('No images provided for composite');
  }

  // Calculate grid dimensions
  const gridSize = GRID_CONFIG.GRID_SIZES[count] || GRID_CONFIG.GRID_SIZES[9];
  const { rows, cols } = gridSize;

  // Create composite canvas
  const compositeWidth = cols * tileSize;
  const compositeHeight = rows * tileSize;

  // Process each image
  const processedImages = await Promise.all(
    imageBuffers.map(async (buffer, index) => {
      try {
        // Resize to tile size
        const processed = await sharp(buffer)
          .resize(tileSize, tileSize, { fit: 'cover', position: 'center' })
          .toFormat('jpeg', { quality: 92 });
        return { buffer: processed, index };
      } catch (error) {
        console.warn(`Failed to process image ${index}:`, error);
        // Return empty tile as placeholder
        return { 
          buffer: await sharp({
            create: {
              width: tileSize,
              height: tileSize,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
          }).jpeg({ quality: 92 }), 
          index 
        };
      }
    })
  );

  // Create composite using composite operation
  let composite = sharp({
    create: {
      width: compositeWidth,
      height: compositeHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  // Composite each image at its grid position
  for (const { buffer, index } of processedImages) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    composite = composite.composite([
      { input: buffer, top: row * tileSize, left: col * tileSize }
    ]);
  }

  // Return as JPEG
  return await composite.jpeg({ quality: 92, background: { r: 0, g: 0, b: 0 } }).toBuffer();
}

/**
 * Trim black bars from an image buffer
 * 
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Buffer>} Trimmed image buffer
 */
export async function trimBlackBars(buffer) {
  try {
    const image = sharp(buffer);
    const { width, height } = await image.metadata();
    
    if (!width || !height) {
      throw new Error('Could not read image dimensions');
    }

    // Get image data to analyze
    const imageArrayBuffer = await image.toBuffer({ resolveWithObject: true }).then(obj => obj.data);
    const inputBuffer = Buffer.from(imageArrayBuffer);
    
    const img = sharp(inputBuffer);
    const { data } = await img.raw().toBuffer({ resolveWithObject: true });
    
    // Find bounding box of non-black pixels
    let minX = width - 1;
    let minY = height - 1;
    let maxX = 0;
    let maxY = 0;
    const threshold = 15;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
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

    // Add padding
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    // If no content found, return original
    if (minX >= maxX || minY >= maxY) {
      return buffer;
    }

    // Crop the image
    const cropWidth = maxX - minX;
    const cropHeight = maxY - minY;

    return await sharp(buffer)
      .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch (error) {
    console.error('Error trimming black bars:', error);
    // Return original buffer on error
    return buffer;
  }
}

/**
 * Resize image to fit within constraints
 * 
 * @param {Buffer} buffer - Input image buffer
 * @param {Object} constraints - Max dimensions
 * @returns {Promise<Buffer>} Resized image buffer
 */
export async function resizeImage(buffer, { maxWidth, maxHeight }) {
  return await sharp(buffer)
    .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer();
}

/**
 * Convert base64 data URL to buffer
 * 
 * @param {string} dataURL - Data URL (data:image/...;base64,...)
 * @returns {Buffer} Image buffer
 */
export function dataURLToBuffer(dataURL) {
  const parts = dataURL.split(',');
  if (parts.length !== 2) {
    throw new Error('Invalid data URL format');
  }
  return Buffer.from(parts[1], 'base64');
}

/**
 * Convert buffer to base64 data URL
 * 
 * @param {Buffer} buffer - Image buffer
 * @param {string} mimeType - MIME type (e.g., 'image/jpeg')
 * @returns {string} Data URL
 */
export function bufferToDataURL(buffer, mimeType = 'image/jpeg') {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}