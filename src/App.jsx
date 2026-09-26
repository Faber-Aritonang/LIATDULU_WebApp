/**
 * LIATDULU - Main App Component
 * 
 * Main application component that integrates all modules
 */

import React, { useState, useCallback } from 'react';
import UploadZone from './components/UploadZone.jsx';
import ProductGrid from './components/ProductGrid.jsx';
import RatioSelector from './components/RatioSelector.jsx';
import ResultCanvas from './components/ResultCanvas.jsx';
import Toast, { ToastContainer } from './components/Toast.jsx';
import AuthModal from './components/AuthModal.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import useGenerate from './hooks/useGenerate.js';
import useAuth from './hooks/useAuth.js';
import { MAX_PRODUCTS, DEFAULT_SETTINGS, ERROR_MESSAGES } from './lib/constants.js';
import { fileToBase64, blobToFile } from './lib/fileHelpers.js';

function App() {
  // State management
  const [modelFile, setModelFile] = useState(null);
  const [modelPreview, setModelPreview] = useState(null);
  const [productFiles, setProductFiles] = useState([]);
  const [selectedRatio, setSelectedRatio] = useState(DEFAULT_SETTINGS.ratio);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Hooks
  const { generate, result, status, progressMessage, error, reset } = useGenerate();
  const { user, isAuthenticated, signIn, signOut } = useAuth();

  /**
   * Handle model image upload
   */
  const handleModelUpload = useCallback(async (file) => {
    setModelFile(file);
    try {
      const preview = URL.createObjectURL(file);
      setModelPreview(preview);
    } catch (e) {
      console.error('Failed to create preview:', e);
    }
  }, []);

  /**
   * Handle product images upload
   */
  const handleProductUpload = useCallback((files) => {
    setProductFiles(files.slice(0, MAX_PRODUCTS));
  }, []);

  /**
   * Handle product removal
   */
  const handleRemoveProduct = useCallback((index) => {
    setProductFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Handle ratio change
   */
  const handleRatioChange = useCallback((ratio) => {
    setSelectedRatio(ratio);
  }, []);

  /**
   * Handle generate button click
   */
  const handleGenerate = useCallback(async () => {
    if (!modelFile) {
      alert(ERROR_MESSAGES.NO_MODEL_IMAGE);
      return;
    }
    if (productFiles.length === 0) {
      alert(ERROR_MESSAGES.NO_PRODUCTS);
      return;
    }

    await generate(modelFile, productFiles, selectedRatio);
  }, [modelFile, productFiles, selectedRatio, generate]);

  /**
   * Handle download of result
   */
  const handleDownload = useCallback(() => {
    if (result?.imageUrl) {
      const a = document.createElement('a');
      a.href = result.imageUrl;
      a.download = `liatdulu-result-${Date.now()}.png`;
      a.click();
    }
  }, [result]);

  /**
   * Handle result regeneration
   */
  const handleRegenerate = useCallback(() => {
    reset();
    handleGenerate();
  }, [reset, handleGenerate]);

  /**
   * Handle reset
   */
  const handleReset = useCallback(() => {
    setModelFile(null);
    setModelPreview(null);
    setProductFiles([]);
    setSelectedRatio(DEFAULT_SETTINGS.ratio);
    reset();
  }, [reset]);

  /**
   * Handle auth button click
   */
  const handleAuthClick = useCallback(() => {
    if (isAuthenticated) {
      signOut();
    } else {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, signOut]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>LIATDULU</h1>
        <p className="app-subtitle">Virtual Fitting Room</p>
        <button className="auth-button" onClick={handleAuthClick}>
          {isAuthenticated ? `👋 ${user?.name || 'Masuk'}` : '🔐 Masuk'}
        </button>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="upload-section">
          <UploadZone
            modelFile={modelFile}
            productFiles={productFiles}
            onModelUpload={handleModelUpload}
            onProductUpload={handleProductUpload}
            onReset={handleReset}
          />
        </div>

        <div className="product-section">
          <ProductGrid
            products={productFiles}
            onRemove={handleRemoveProduct}
          />
        </div>

        <div className="controls-section">
          <RatioSelector
            value={selectedRatio}
            onChange={handleRatioChange}
          />
          
          <button
            className="generate-button"
            onClick={handleGenerate}
            disabled={status === 'processing' || productFiles.length === 0}
          >
            {status === 'processing' ? '⏳ Sedang diproses...' : '🎯 Buat Hasil Fitting'}
          </button>
        </div>

        <div className="result-section">
          {result?.imageUrl && (
            <ResultCanvas
              imageUrl={result.imageUrl}
              onRegenerate={handleRegenerate}
              onDownload={handleDownload}
            />
          )}
        </div>
      </main>

      {/* History Panel */}
      <HistoryPanel />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Toast Container */}
      <ToastContainer />

      {/* Progress indicator */}
      {status === 'processing' && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: progressMessage ? '100%' : '0%' }}></div>
          <div className="progress-message">{progressMessage}</div>
        </div>
      )}

      <style jsx>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .app-header h1 {
          font-size: 2rem;
          color: #1a1a1a;
          margin: 0;
        }

        .app-subtitle {
          font-size: 1rem;
          color: #666;
          margin: 0;
        }

        .auth-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 8px;
          background: #3b82f6;
          color: white;
          cursor: pointer;
          font-weight: 500;
        }

        .app-main {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 768px) {
          .app-main {
            grid-template-columns: 1fr;
          }
        }

        .upload-section, .product-section, .controls-section, .result-section {
          padding: 1rem;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          background: #fafafa;
        }

        .upload-section {
          grid-column: span 2;
        }

        .generate-button {
          padding: 1rem 2rem;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          width: 100%;
        }

        .generate-button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }

        .progress-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: #e5e5e5;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s;
        }

        .progress-message {
          position: fixed;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}

export default App;