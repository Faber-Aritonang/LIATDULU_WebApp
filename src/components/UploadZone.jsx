/**
 * LIATDULU - Upload Zone Component
 * 
 * Handles drag & drop and file input for model photo and product images
 */

import React, { useCallback, useState } from 'react';
import { MAX_PRODUCTS, IMAGE_CONSTRAINTS, ERROR_MESSAGES } from '../lib/constants.js';
import { isValidImageFile, formatFileSize } from '../lib/fileHelpers.js';

/**
 * UploadZone - File upload component
 * 
 * @param {Object} props
 * @param {Function} props.onModelUpload - Callback when model image is uploaded
 * @param {Function} props.onProductUpload - Callback when product images are uploaded
 * @param {File} props.modelFile - Currently selected model file
 * @param {File[]} props.productFiles - Currently selected product files
 * @param {Function} props.onReset - Callback to reset all files
 */
export default function UploadZone({
  modelFile,
  productFiles,
  onModelUpload,
  onProductUpload,
  onReset
}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Handle file validation and processing
   */
  const handleFiles = useCallback((files) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => isValidImageFile(file));

    if (validFiles.length !== files.length) {
      setError(ERROR_MESSAGES.INVALID_FILE);
      return;
    }

    // Check file sizes
    for (const file of validFiles) {
      if (file.size > IMAGE_CONSTRAINTS.MAX_FILE_SIZE) {
        setError(ERROR_MESSAGES.FILE_TOO_LARGE.replace('{size}', (IMAGE_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)));
        return;
      }
    }

    if (!modelFile && !error) {
      // First file is model image
      onModelUpload(validFiles[0]);
      if (validFiles.length > 1) {
        onProductUpload(validFiles.slice(1, MAX_PRODUCTS + 1));
      }
    } else {
      // Additional files are products
      const newProducts = [...(productFiles || []), ...validFiles].slice(0, MAX_PRODUCTS);
      onProductUpload(newProducts);
    }

    setError(null);
  }, [modelFile, productFiles, error, onModelUpload, onProductUpload]);

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  /**
   * Handle drop event
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles]);

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback((e) => {
    const files = e.target.files;
    handleFiles(files);
    // Reset input value so same file can be selected again
    e.target.value = '';
  }, [handleFiles]);

  /**
   * Handle reset button click
   */
  const handleReset = useCallback(() => {
    setError(null);
    onReset && onReset();
  }, [onReset]);

  return (
    <div className="upload-zone">
      <div
        className={`upload-dropzone ${dragOver ? 'drag-over' : ''} ${error ? 'error' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-icon">📁</div>
        <h3>Upload Foto Diri & Pakaian</h3>
        <p>Seret gambar ke sini atau klik untuk memilih</p>
        <p className="upload-hint">
          Format: JPEG, PNG, WebP | Maks: {(IMAGE_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB per file | Maks {MAX_PRODUCTS} produk
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          id="upload-input"
        />
        <label htmlFor="upload-input" className="upload-button">
          Pilih File
        </label>

        {modelFile && (
          <div className="file-info">
            <span className="file-name">👤 {modelFile.name}</span>
          </div>
        )}

        {productFiles && productFiles.length > 0 && (
          <div className="file-count">
            👕 {productFiles.length}/{MAX_PRODUCTS} produk dipilih
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>

      {(modelFile || (productFiles && productFiles.length > 0)) && (
        <button className="reset-button" onClick={handleReset}>
          Reset Semua
        </button>
      )}
    </div>
  );
}