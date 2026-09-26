/**
 * LIATDULU - useClipboard Hook
 * 
 * Handles clipboard paste events for file uploads
 */

import { useState, useCallback, useEffect } from 'react';
import { fileToBase64 } from '../lib/fileHelpers.js';

export default function useClipboard(onPasteModel, onPasteProduct) {
  const [pasteError, setPasteError] = useState(null);

  /**
   * Handle clipboard paste event
   * 
   * @param {ClipboardEvent} e - Clipboard event
   * @param {File|null} currentModelFile - Currently selected model file
   * @param {File[]} currentProductFiles - Currently selected product files
   */
  const handleClipboardPaste = useCallback((e, currentModelFile, currentProductFiles) => {
    e.preventDefault();

    // Check if clipboard has files
    if (!e.clipboardData || !e.clipboardData.files || e.clipboardData.files.length === 0) {
      return;
    }

    const files = Array.from(e.clipboardData.files).filter(file => file.type.startsWith('image/'));

    if (files.length === 0) {
      setPasteError('Tidak ada gambar di clipboard');
      return;
    }

    // Determine paste context based on current state
    if (!currentModelFile) {
      // Paste as model image
      onPasteModel(files[0]);
      setPasteError(null);
    } else {
      // Paste as product image
      const newProducts = [...currentProductFiles, ...files].slice(0, 9);
      onPasteProduct(newProducts);
      setPasteError(null);
    }
  }, [onPasteModel, onPasteProduct]);

  /**
   * Set up clipboard event listener
   */
  useEffect(() => {
    const handlePaste = (e) => {
      // Get current state from a ref or context
      // This is a simplified version - in real usage, you'd need to track
      // current files through a ref or context
      handleClipboardPaste(e, null, []);
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleClipboardPaste]);

  return {
    handleClipboardPaste,
    pasteError
  };
}

/**
 * Hook for handling clipboard paste with file management
 * 
 * @returns {Object} Paste handler and error state
 */
export function useClipboardFilePaste() {
  const [pasteError, setPasteError] = useState(null);

  /**
   * Paste files from clipboard
   * 
   * @param {ClipboardEvent} e - Clipboard paste event
   * @returns {Promise<File[]>} Array of valid image files
   */
  const pasteFiles = useCallback(async (e) => {
    e.preventDefault();

    if (!e.clipboardData || !e.clipboardData.files) {
      return [];
    }

    const files = Array.from(e.clipboardData.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setPasteError('Tidak ada gambar yang dapat ditempel');
      return [];
    }

    setPasteError(null);
    return imageFiles;
  }, []);

  /**
   * Check if clipboard contains image data
   * 
   * @param {ClipboardEvent} e - Clipboard paste event
   * @returns {boolean} True if contains images
   */
  const hasImageClipboardData = useCallback((e) => {
    if (!e.clipboardData) return false;
    
    // Check files
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      return Array.from(e.clipboardData.files).some(f => f.type.startsWith('image/'));
    }

    // Check items for image data
    if (e.clipboardData.items) {
      return Array.from(e.clipboardData.items).some(
        item => item.type.startsWith('image/')
      );
    }

    return false;
  }, []);

  return {
    pasteFiles,
    hasImageClipboardData,
    pasteError
  };
}