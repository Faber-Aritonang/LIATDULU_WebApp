/**
 * LIATDULU - Auth Error Page
 *
 * Custom error page for NextAuth authentication errors
 */

import React from 'react';

// Error messages mapping
const ERROR_MESSAGES = {
  Configuration: 'Terjadi kesalahan konfigurasi server.',
  AccessDenied: 'Akses ditolak. Anda tidak memiliki izin untuk masuk.',
  Verification: 'Link verifikasi telah kedaluwarsa atau sudah digunakan.',
  OAuthSignin: 'Terjadi kesalahan saat masuk dengan OAuth.',
  OAuthCallback: 'Terjadi kesalahan saat callback OAuth.',
  OAuthCreateAccount: 'Gagal membuat akun OAuth.',
  EmailCreateAccount: 'Gagal membuat akun email.',
  Callback: 'Terjadi kesalahan pada callback.',
  OAuthAccountNotLinked: 'Email ini sudah terdaftar dengan metode masuk lain.',
  Default: 'Terjadi kesalahan saat autentikasi.'
};

export default function AuthError() {
  // Get error type from query params
  const params = new URLSearchParams(window.location.search);
  const errorType = params.get('error') || 'Default';

  const errorMessage = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.Default;

  return (
    <div className="auth-page">
      <div className="auth-page-card">
        <div className="auth-page-header">
          <h1>LIATDULU</h1>
          <p>Virtual Fitting Room</p>
        </div>

        <div className="auth-page-error-icon">⚠️</div>

        <h2>Gagal Masuk</h2>

        <div className="auth-page-error-message">
          <p>{errorMessage}</p>
          {errorType !== 'Default' && (
            <p className="auth-page-error-code">Kode error: {errorType}</p>
          )}
        </div>

        <div className="auth-page-actions">
          <a href="/auth/signin" className="auth-page-button primary">
            🔄 Coba Lagi
          </a>
          <a href="/" className="auth-page-button secondary">
            ← Kembali ke Beranda
          </a>
        </div>
      </div>
    </div>
  );
}
