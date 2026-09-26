/**
 * LIATDULU - Constants and Configuration
 * 
 * Central location for all magic values and configuration constants
 */

// Environment variables (server-side)
export const ENV = {
  BYNARA_API_KEY: process.env.BYNARA_API_KEY,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  POSTGRES_URL: process.env.POSTGRES_URL,
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN
};

// Supported aspect ratios for fitting
export const RATIO_OPTIONS = [
  { value: '9:16', label: 'Portrait (9:16)', icon: '📱' },
  { value: '3:4', label: 'Standard (3:4)', icon: '📐' },
  { value: '1:1', label: 'Square (1:1)', icon: '⬜' },
  { value: '16:9', label: 'Landscape (16:9)', icon: '🌅' }
];

// Map ratio to Bynara API size
export const RATIO_TO_SIZE = {
  '9:16': '1024x1536',
  '3:4': '1024x1280',
  '1:1': '1024x1024',
  '16:9': '1536x1024'
};

// Image processing constraints
export const IMAGE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_WIDTH: 4096,
  MAX_HEIGHT: 4096,
  MIN_WIDTH: 256,
  MIN_HEIGHT: 256,
  ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  MODEL_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  PRODUCT_FORMATS: ['image/jpeg', 'image/png', 'image/webp']
};

// Maximum number of products that can be uploaded
export const MAX_PRODUCTS = 9;
export const MAX_FILES = MAX_PRODUCTS + 1; // +1 for model image

// Composite grid configuration
export const GRID_CONFIG = {
  TILE_SIZE: 512,
  GRID_SIZES: {
    1: { rows: 1, cols: 1 },
    2: { rows: 2, cols: 2 },
    3: { rows: 2, cols: 2 },
    4: { rows: 2, cols: 2 },
    5: { rows: 3, cols: 2 },
    6: { rows: 3, cols: 2 },
    7: { rows: 3, cols: 3 },
    8: { rows: 3, cols: 3 },
    9: { rows: 3, cols: 3 }
  }
};

// Progress messages for user feedback
export const PROGRESS_MESSAGES = [
  'Memvalidasi gambar...',
  'Membuat komposit produk...',
  'Mengirim ke AI untuk penghiasan...',
  'Sedang menjahit hasil...',
  'Merapikan gambar...'
];

// Error messages
export const ERROR_MESSAGES = {
  NETWORK: 'Gagal menghubungi server. Coba lagi nanti.',
  RATE_LIMIT: 'Terlalu banyak permintaan. Coba lagi dalam {minutes} menit.',
  INVALID_FILE: 'Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.',
  FILE_TOO_LARGE: 'File terlalu besar. Maksimal {size}MB per gambar.',
  NO_MODEL_IMAGE: 'Silakan unggah foto diri Anda.',
  NO_PRODUCTS: 'Silakan ungghap minimal 1 produk pakaian.',
  PROCESSING_FAILED: 'Gagal memproses gambar.',
  AUTH_REQUIRED: 'Anda harus login untuk menyimpan riwayat.'
};

// API endpoints
export const API_ENDPOINTS = {
  GENERATE: '/api/generate',
  HISTORY: '/api/history',
  HISTORY_DELETE: (id) => `/api/history/${id}`,
  AUTH_SIGN_IN: '/api/auth/signin',
  AUTH_SIGN_OUT: '/api/auth/signout'
};

// Default settings
export const DEFAULT_SETTINGS = {
  ratio: '9:16',
  maxProducts: MAX_PRODUCTS,
  enableHistory: true
};