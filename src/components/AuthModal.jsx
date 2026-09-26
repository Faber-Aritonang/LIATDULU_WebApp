/**
 * LIATDULU - AuthModal Component
 * 
 * Modal for user authentication (sign in)
 */

import React, { useState } from 'react';
import useAuth from '../hooks/useAuth.js';

export default function AuthModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [useAuth] = useAuth();

  const handleGoogleSignIn = async () => {
    useAuth.signIn.google();
    onClose && onClose();
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setEmailError('');
    
    if (!email) {
      setEmailError('Email wajib diisi');
      return;
    }

    setEmailLoading(true);
    
    try {
      await useAuth.signIn.email(email);
    } catch (err) {
      setEmailError(err.message || 'Gagal mengirim magic link');
    } finally {
      setEmailLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <h2>Masuk ke LIATDULU</h2>
        
        <button className="auth-button google" onClick={handleGoogleSignIn}>
          <span className="google-icon">G</span>
          Masuk dengan Google
        </button>

        <div className="auth-divider">
          <span>atau</span>
        </div>

        <form className="auth-email-form" onSubmit={handleEmailSignIn}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={emailLoading}
            required
          />
          <button type="submit" disabled={emailLoading}>
            {emailLoading ? ' Mengirim...' : 'Kirim Magic Link'}
          </button>
        </form>

        {emailError && <div className="auth-error">{emailError}</div>}

        <button className="auth-close" onClick={onClose}>
          Batal
        </button>
      </div>
    </div>
  );
}