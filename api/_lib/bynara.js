/**
 * LIATDULU - Bynara API Client
 * 
 * Client for interacting with Bynara Router API (qwen-image-2.0-pro)
 */

import { BynaraAPIError } from './errors.js';

// Map ratio to Bynara API size (duplicated from frontend constants to avoid cross-import)
const RATIO_TO_SIZE = {
  '9:16': '1024x1536',
  '3:4': '1024x1280',
  '1:1': '1024x1024',
  '16:9': '1536x1024'
};

// Bynara API configuration
// Note: generation AND result download both live on router.bynara.id.
// Image models available on PAYG: agnes-image-2.0-flash (Rp10/1K img),
// agnes-image-2.1-flash (Rp20/1K img), gpt-image-2 (Rp50/1K img).
const BYNARA_API_BASE = 'https://router.bynara.id/v1/images';
const DEFAULT_MODEL = process.env.BYNARA_IMAGE_MODEL || 'agnes-image-2.1-flash';
const DEFAULT_TIMEOUT = 120000; // 2 minutes
const MAX_RETRIES = 3;

/**
 * Get image size from aspect ratio
 * 
 * @param {string} ratio - Aspect ratio (e.g., "9:16", "1:1")
 * @returns {string} Image size (e.g., "1024x1536")
 */
export function getSizeFromRatio(ratio) {
  return RATIO_TO_SIZE[ratio] || RATIO_TO_SIZE['9:16'];
}

/**
 * Build prompt for fitting image
 * 
 * @returns {string} Prompt text in Indonesian
 */
export function buildPrompt() {
  return `Orang yang ada di Gambar 1 mengenakan semua item pakaian yang 
ditampilkan di Gambar 2. Pertahankan wajah asli, warna kulit, 
proporsi tubuh, dan pose dari orang di Gambar 1. 
Ganti hanya bagian pakaian. Hasil harus fotorealistis dan 
berkualitas tinggi. Pastikan semua item pakaian dari Gambar 2 
digunakan secara harmonis pada orang tersebut.`;
}

/**
 * Create FormData for Bynara API request
 *
 * Verified against the live API (2026-09):
 * - Multiple input images are sent as REPEATED `image` multipart fields
 *   (the Go backend unmarshals `image []string`). First image = person,
 *   second image = product composite.
 * - `size`, `n`, `response_format` are supported.
 *
 * @param {Buffer} modelBuffer - Model/image buffer
 * @param {Buffer} productBuffer - Product composite buffer
 * @param {string} ratio - Output aspect ratio
 * @returns {FormData} Form data ready to send
 */
export function createFormData(modelBuffer, productBuffer, ratio) {
  const form = new FormData();

  form.append('model', DEFAULT_MODEL);
  form.append('prompt', buildPrompt());
  form.append('size', getSizeFromRatio(ratio));
  form.append('n', '1');
  form.append('response_format', 'b64_json');

  // Repeated `image` fields: person first, products second
  form.append('image', new Blob([modelBuffer], { type: 'image/jpeg' }), 'model.jpg');
  form.append('image', new Blob([productBuffer], { type: 'image/jpeg' }), 'products.jpg');

  return form;
}

/**
 * Fetch with exponential backoff retry logic
 * 
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithBackoff(url, options, retries = MAX_RETRIES) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    });
    return response;
  } catch (error) {
    if (retries > 0 && (error.name === 'AbortError' || error.message.includes('fetch'))) {
      // Exponential backoff
      const delay = (MAX_RETRIES - retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithBackoff(url, options, retries - 1);
    }
    throw error;
  }
}

/**
 * Generate fitting image using Bynara API
 * 
 * @param {Object} params - Parameters object
 * @param {Buffer} params.modelBuffer - Model/photo buffer
 * @param {Buffer} params.productBuffer - Product composite buffer
 * @param {string} params.ratio - Output aspect ratio (e.g., "9:16")
 * @param {string} [params.apiKey] - Override API key
 * @returns {Promise<string>} Base64 data URL of result
 * @throws {BynaraAPIError} If Bynara API returns an error
 */
export async function generateFitting({ modelBuffer, productBuffer, ratio, apiKey }) {
  if (!modelBuffer) {
    throw new Error('Model buffer is required');
  }
  if (!productBuffer) {
    throw new Error('Product buffer is required');
  }

  const form = createFormData(modelBuffer, productBuffer, ratio);
  
  const response = await fetchWithBackoff(
    `${BYNARA_API_BASE}/edits`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey || process.env.BYNARA_API_KEY}`
      },
      body: form
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new BynaraAPIError(response.status, errorBody);
  }

  const data = await response.json();

  const first = data?.data?.[0];
  if (!first) {
    throw new BynaraAPIError(
      response.status,
      'Invalid response from Bynara API'
    );
  }

  // Preferred: base64 payload (response_format=b64_json)
  if (first.b64_json) {
    return `data:image/png;base64,${first.b64_json}`;
  }

  // Fallback: relative URL to the generated image; download with auth
  // and convert to a data URL. Result URLs only resolve on the router host.
  if (first.url) {
    const downloadUrl = first.url.startsWith('http')
      ? first.url
      : `${BYNARA_API_BASE.replace(/\/v1\/images$/, '')}${first.url}`;

    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${apiKey || process.env.BYNARA_API_KEY}`,
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });

    if (!downloadResponse.ok) {
      throw new BynaraAPIError(
        downloadResponse.status,
        `Failed to download generated image: ${downloadUrl}`
      );
    }

    const buffer = Buffer.from(await downloadResponse.arrayBuffer());
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  throw new BynaraAPIError(
    response.status,
    'Bynara response contained neither b64_json nor url'
  );
}

/**
 * Check Bynara API health
 * 
 * @param {string} [apiKey] - Override API key
 * @returns {Promise<{healthy: boolean, responseTime: number}>} Health check result
 */
export async function checkBynaraHealth(apiKey) {
  const start = Date.now();

  try {
    // POST ke /edits dengan body kosong untuk membedakan 401 (auth salah)
    // dari 400 (endpoint hidup, request memang tidak valid).
    // Endpoint /models tidak tersedia di Bynara Router (404).
    const response = await fetch(`${BYNARA_API_BASE}/edits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey || process.env.BYNARA_API_KEY}`
      },
      signal: AbortSignal.timeout(10000)
    });

    const responseTime = Date.now() - start;

    // 400 = endpoint hidup & API key diterima (request memang kosong/invalid)
    if (response.status === 401 || response.status === 403) {
      return { healthy: false, responseTime, error: 'API key invalid or unauthorized' };
    }

    if (response.status === 404) {
      return { healthy: false, responseTime, error: 'API endpoint not found (check BYNARA_API_BASE)' };
    }

    return { healthy: true, responseTime };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - start,
      error: error.message
    };
  }
}

/**
 * Get available models from Bynara API
 * 
 * @param {string} [apiKey] - Override API key
 * @returns {Promise<string[]>} Array of model names
 */
export async function getAvailableModels(apiKey) {
  const response = await fetch(`${BYNARA_API_BASE}/models`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey || process.env.BYNARA_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new BynaraAPIError(response.status, await response.text());
  }

  const data = await response.json();
  return data.data || [];
}

// Export default for convenience
export default {
  generateFitting,
  getSizeFromRatio,
  buildPrompt,
  createFormData,
  fetchWithBackoff,
  checkBynaraHealth,
  getAvailableModels
};