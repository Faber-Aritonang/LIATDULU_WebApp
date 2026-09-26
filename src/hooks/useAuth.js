/**
 * LIATDULU - useAuth Hook
 * 
 * Manages authentication state for the frontend
 */

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../lib/constants.js';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Check authentication status
   */
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign in with Google
   */
  const signInGoogle = useCallback(async () => {
    window.location.href = '/api/auth/signin/google';
  }, []);

  /**
   * Sign in with email magic link
   * @param {string} email - User email
   */
  const signInEmail = useCallback(async (email) => {
    try {
      const response = await fetch('/api/auth/signin/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to send magic link');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signIn: {
      google: signInGoogle,
      email: signInEmail
    },
    signOut,
    refresh: checkAuth
  };
}

/**
 * Custom hook for session state
 * Exposes session data from NextAuth
 */
export function useSession() {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setSession(data);
        setStatus(data?.user ? 'authenticated' : 'unauthenticated');
      } catch {
        setStatus('unauthenticated');
      }
    };

    fetchSession();
  }, []);

  return { data: session, status };
}