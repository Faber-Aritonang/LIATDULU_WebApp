/**
 * LIATDULU - Main App Component
 *
 * Main application component that integrates all modules
 */

import React, { useState, useCallback } from 'react';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import UploadZone from './components/UploadZone.jsx';
import ProductGrid from './components/ProductGrid.jsx';
import RatioSelector from './components/RatioSelector.jsx';
import ResultCanvas from './components/ResultCanvas.jsx';
import Toast, { ToastContainer } from './components/Toast.jsx';
import AuthModal from './components/AuthModal.jsx';
import AuthSignIn from './components/AuthSignIn.jsx';
import AuthError from './components/AuthError.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import { ResultCanvasSkeleton } from './components/Skeleton.jsx';
import useGenerate from './hooks/useGenerate.js';
import useAuth from './hooks/useAuth.js';
import { MAX_PRODUCTS, DEFAULT_SETTINGS, ERROR_MESSAGES } from './lib/constants.js';
import { fileToBase64, blobToFile } from './lib/fileHelpers.js';

/**
 * Simple client-side router
 * Handles /auth/signin and /auth/error routes
 */
function useRouter() {
  const path = window.location.pathname;
  return { path };
}

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
  const { path } = useRouter();

  // Route handling for auth pages
  if (path === '/auth/signin') {
    return <AuthSignIn />;
  }
  if (path === '/auth/error') {
    return <AuthError />;
  }

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
    <ErrorBoundary>
      <div className="app">
        {/* Header */}
        <header className="app-header">
          <div className="app-header-left">
            <a href="/" className="back-link" title="Kembali ke Landing Page">
              ← Beranda
            </a>
            <div>
              <h1>LIATDULU</h1>
              <p className="app-subtitle">Virtual Fitting Room</p>
            </div>
          </div>
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
            <ErrorBoundary>
              {status === 'processing' ? (
                <ResultCanvasSkeleton />
              ) : result?.imageUrl ? (
                <ResultCanvas
                  imageUrl={result.imageUrl}
                  onRegenerate={handleRegenerate}
                  onDownload={handleDownload}
                />
              ) : (
                <ResultCanvas imageUrl={null} />
              )}
            </ErrorBoundary>
          </div>
        </main>

        {/* History Panel */}
        <ErrorBoundary>
          <HistoryPanel />
        </ErrorBoundary>

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
      </div>
    </ErrorBoundary>
  );
}

export default App;