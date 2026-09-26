/**
 * LIATDULU - Bynara API Client
 * 
 * Client for interacting with Bynara Router API (qwen-image-2.0-pro)
 */

import { BynaraAPIError } from './errors.js';
import { RATIO_TO_SIZE } from '../../src/lib/constants.js';

// Bynara API configuration
const BYNARA_API_BASE = 'https://api-images.bynara.id/v1/images';
const DEFAULT_MODEL = 'qwen-image-2.0-pro';
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
  form.append('prompt_extend', 'true');
  form.append('watermark', 'false');
  form.append('n', '1');
  form.append('response_format', 'b64_json');
  
  // Append images as blobs
  form.append('image', new Blob([modelBuffer], { type: 'image/jpeg' }), 'model.jpg');
  form.append('image2', new Blob([productBuffer], { type: 'image/jpeg' }), 'products.jpg');
  
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

  if (!data || !data.data || !data.data[0]) {
    throw new BynaraAPIError(
      response.status,
      'Invalid response from Bynara API'
    );
  }

  // Get base64 result
  const b64Image = data.data[0].b64_json;

  // Convert to data URL
  const imageData = Buffer.from(b64Image, 'base64');
  const dataURL = `data:image/jpeg;base64,${b64Image}`;

  return dataURL;
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
    const response = await fetch(`${BYNARA_API_BASE}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey || process.env.BYNARA_API_KEY}`
      },
      signal: AbortSignal.timeout(10000)
    });

    const responseTime = Date.now() - start;

    if (!response.ok) {
      return { healthy: false, responseTime, error: 'API returned error' };
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