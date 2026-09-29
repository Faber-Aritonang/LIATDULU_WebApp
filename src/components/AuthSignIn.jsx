/**
 * LIATDULU - Sign In Page
 *
 * Custom sign-in page for NextAuth
 * Handles Google OAuth and Email Magic Link
 */

import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth.js';

export default function AuthSignIn() {
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const { signIn, isAuthenticated, user } = useAuth();

  // Get callback URL from query params
  const params = new URLSearchParams(window.location.search);
  const callbackUrl = params.get('callbackUrl') || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = callbackUrl;
    }
  }, [isAuthenticated, callbackUrl]);

  const handleGoogleSignIn = () => {
    // Redirect to NextAuth Google provider
    window.location.href = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email wajib diisi');
      return;
    }

    setEmailLoading(true);

    try {
      // Redirect to NextAuth Email provider
      window.location.href = `/api/auth/signin/email?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    } catch (err) {
      setError(err.message || 'Gagal mengirim magic link');
      setEmailLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page-card">
        <div className="auth-page-header">
          <h1>LIATDULU</h1>
          <p>Virtual Fitting Room</p>
        </div>

        <h2>Masuk ke Akun Anda</h2>

        {error && (
          <div className="auth-page-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          className="auth-page-button google"
          onClick={handleGoogleSignIn}
        >
          <span className="auth-page-icon">G</span>
          Masuk dengan Google
        </button>

        <div className="auth-page-divider">
          <span>atau</span>
        </div>

        {emailSent ? (
          <div className="auth-page-success">
            <span>✉️</span>
            <p>Magic link telah dikirim ke <strong>{email}</strong></p>
            <p className="auth-page-hint">Cek inbox email Anda dan klik link untuk masuk.</p>
          </div>
        ) : (
          <form className="auth-page-form" onSubmit={handleEmailSignIn}>
            <input
              type="email"
              placeholder="Masukkan email Anda"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={emailLoading}
              required
            />
            <button type="submit" disabled={emailLoading}>
              {emailLoading ? '⏳ Mengirim...' : '✉️ Kirim Magic Link'}
            </button>
          </form>
        )}

        <div className="auth-page-footer">
          <a href="/">← Kembali ke Beranda</a>
        </div>
      </div>
    </div>
  );
}
