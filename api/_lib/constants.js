/**
 * LIATDULU - Backend Constants
 *
 * Server-side constants to avoid cross-boundary import from frontend
 */

// Image processing constraints
export const IMAGE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_WIDTH: 4096,
  MAX_HEIGHT: 4096,
  MIN_WIDTH: 256,
  MIN_HEIGHT: 256,
  ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/webp']
};

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

// Map ratio to Bynara API size
export const RATIO_TO_SIZE = {
  '9:16': '1024x1536',
  '3:4': '1024x1280',
  '1:1': '1024x1024',
  '16:9': '1536x1024'
};

// Maximum number of products
export const MAX_PRODUCTS = 9;
export const MAX_FILES = MAX_PRODUCTS + 1; // +1 for model image
