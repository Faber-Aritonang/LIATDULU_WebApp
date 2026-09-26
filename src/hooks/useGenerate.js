/**
 * LIATDULU - useGenerate Hook
 * 
 * Handles the generation logic, state management, and progress tracking
 */

import { useState, useCallback } from 'react';
import { API_ENDPOINTS, PROGRESS_MESSAGES, ERROR_MESSAGES } from '../lib/constants.js';

export default function useGenerate() {
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | done | error
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState(null);

  /**
   * Generate a fitting result
   * 
   * @param {File} modelFile - Model photo
   * @param {File[]} productFiles - Product photos
   * @param {string} ratio - Output aspect ratio (e.g., "9:16")
   * @returns {Promise<string>} URL of the generated image
   */
  const generate = useCallback(async (modelFile, productFiles, ratio) => {
    if (!modelFile || (!productFiles || productFiles.length === 0)) {
      setError(productFiles ? ERROR_MESSAGES.NO_MODEL_IMAGE : ERROR_MESSAGES.NO_PRODUCTS);
      return;
    }

    try {
      setStatus('uploading');
      setError(null);
      setResult(null);

      // Simulate progress messages
      for (let i = 0; i < PROGRESS_MESSAGES.length; i++) {
        setProgressMessage(PROGRESS_MESSAGES[i]);
        await new Promise(resolve => setTimeout(resolve, i * 100));
      }

      // Create FormData
      const formData = new FormData();
      formData.append('modelImage', modelFile);
      formData.append('ratio', ratio);

      productFiles.forEach((file, index) => {
        formData.append(`productImage${index + 1}`, file);
      });

      setStatus('processing');
      setProgress(50);

      // Send to API
      const response = await fetch(API_ENDPOINTS.GENERATE, {
        method: 'POST',
        body: formData
      });

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Gagal memproses gambar');
      }

      const data = await response.json();

      setProgress(100);
      setResult(data);
      setStatus('done');

      // Clear error
      setError(null);

      return data.imageUrl;

    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || ERROR_MESSAGES.PROCESSING_FAILED);
      setStatus('error');
      return null;
    } finally {
      // Reset progress after delay
      setTimeout(() => {
        setProgressMessage('');
        setProgress(0);
      }, 1000);
    }
  }, []);

  /**
   * Reset the generation state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setError(null);
    setProgressMessage('');
  }, []);

  return {
    generate,
    result,
    status,
    progress,
    progressMessage,
    error,
    reset
  };
}