/**
 * LIATDULU - Generate Endpoint
 * 
 * POST /api/generate
 * 
 * Main endpoint for virtual fitting room functionality
 */

import formidable from 'formidable';
import { promises as fs } from 'fs';
import {
  validateImageBuffer,
  createCompositeImage,
  trimBlackBars,
  dataURLToBuffer,
  bufferToDataURL
} from './_lib/imageProcessor.js';
import { generateFitting, getSizeFromRatio } from './_lib/bynara.js';
import { checkRateLimit } from './_lib/rateLimit.js';
import { saveResult, deleteResult } from './_lib/storage.js';
import { addHistory } from './_lib/db.js';
import { RateLimitError, ValidationError, FileValidationError, BynaraAPIError, StorageError } from './_lib/errors.js';
import { getEnv } from './_lib/env.js';
import { RATE_LIMIT_DEFAULTS } from './_lib/env.js';

// Configure formidable for Vercel Functions
export const config = {
  api: {
    bodyParser: false,
  // Increase memory limit for large file uploads
    maxBodySize: '50mb'
  }
};

/**
 * Parse multipart form data
 * 
 * @param {Request} req - Incoming request
 * @returns {Promise<Object>} Form data with files
 */
async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 20 * 1024 * 1024, // 20MB
      maxFiles: 10,
      multiples: true
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(new FileValidationError('unknown', `Form parse error: ${err.message}`));
        return;
      }
      resolve({ fields, files });
    });
  });
}

/**
 * Get client identifier for rate limiting
 * 
 * @param {Request} req - Incoming request
 * @returns {string} Identifier (userId from session or IP)
 */
function getClientIdentifier(req) {
  // In Vercel, we can get IP from headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  return 'unknown';
}

/**
 * Main handler for POST /api/generate
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
    return;
  }

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(200).json({});
      return;
    }

    // 1. Parse form data
    const { fields, files } = await parseForm(req);

    // 2. Validate required fields
    const ratio = fields.ratio || '9:16';
    const userId = fields.userId || null;

    // 3. Get model image
    const modelFile = files.modelImage;
    if (!modelFile) {
      throw new ValidationError('modelImage', 'Model image is required');
    }

    // 4. Get product images
    const productFiles = [];
    for (let i = 0; i < 10; i++) {
      const key = `productImage${i + 1}`;
      if (files[key]) {
        productFiles.push(files[key]);
      }
    }

    if (productFiles.length === 0) {
      throw new ValidationError('productImages', 'At least one product image is required');
    }

    // 5. Check rate limit
    const identifier = userId || getClientIdentifier(req);
    const rateResult = await checkRateLimit({
      identifier,
      max: RATE_LIMIT_DEFAULTS.max,
      window: RATE_LIMIT_DEFAULTS.window
    });

    if (!rateResult.allowed) {
      throw new RateLimitError(
        RATE_LIMIT_DEFAULTS.max,
        Math.ceil(rateResult.resetAt / 1000),
        rateResult.remaining
      );
    }

    // 6. Validate and read model image
    const modelBuffer = await fs.readFile(modelFile[0].filepath || modelFile[0].stream);
    const modelValidation = await validateImageBuffer(modelBuffer);
    if (!modelValidation.valid) {
      throw new FileValidationError('modelImage', modelValidation.error);
    }

    // 7. Validate product images
    const productBuffers = [];
    for (const file of productFiles) {
      const buffer = await fs.readFile(file[0].filepath || file[0].stream);
      const validation = await validateImageBuffer(buffer);
      if (!validation.valid) {
        throw new FileValidationError(`productImage-${file[0].filename}`, validation.error);
      }
      productBuffers.push(buffer);
    }

    // 8. Get target size from ratio
    const size = getSizeFromRatio(ratio);

    // 9. Create composite image (products grid)
    const compositeBuffer = await createCompositeImage(productBuffers, { tileSize: 512 });

    // 10. Generate fitting with Bynara API
    const resultUrl = await generateFitting({
      modelBuffer,
      productBuffer: compositeBuffer,
      ratio,
      apiKey: getEnv().bynaraApiKey()
    });

    // 11. Trim black bars from result
    const trimmedUrl = await trimBlackBarsFromBase64(resultUrl);

    // 12. Save to Vercel Blob
    const savedResult = await saveResult(trimmedUrl, userId || 'anonymous');

    // 13. Save to history (if user authenticated)
    let historyId = null;
    if (userId) {
      const historyEntry = await addHistory({
        userId,
        resultUrl: savedResult.url,
        blobPath: savedResult.pathname,
        ratio,
        productCount: productFiles.length
      });
      historyId = historyEntry.id;
    }

    // 14. Clean up temp files
    for (const file of productFiles) {
      if (file[0].filepath) {
        await fs.unlink(file[0].filepath).catch(() => {});
      }
    }
    if (modelFile[0].filepath) {
      await fs.unlink(modelFile[0].filepath).catch(() => {});
    }

    // Return success response
    res.status(200).json({
      success: true,
      imageUrl: savedResult.url,
      historyId,
      data: {
        ratio,
        productCount: productFiles.length,
        blobPath: savedResult.pathname
      }
    });

  } catch (error) {
    // Handle known errors
    if (error instanceof ValidationError || 
        error instanceof FileValidationError ||
        error instanceof RateLimitError ||
        error instanceof BynaraAPIError ||
        error instanceof StorageError) {
      const { statusCode, toResponse } = error;
      res.status(statusCode).json(toResponse());
      return;
    }

    // Handle unknown errors
    console.error('Unhandled error in /api/generate:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
}

/**
 * Trim black bars from base64 image result
 *
 * @param {string} base64Url - Base64 data URL
 * @returns {Promise<string>} Trimmed base64 data URL
 */
async function trimBlackBarsFromBase64(base64Url) {
  try {
    const buffer = dataURLToBuffer(base64Url);
    const trimmedBuffer = await trimBlackBars(buffer);
    return bufferToDataURL(trimmedBuffer, 'image/jpeg');
  } catch (error) {
    console.error('Failed to trim black bars:', error);
    return base64Url;
  }
}