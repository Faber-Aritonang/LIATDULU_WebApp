/**
 * LIATDULU - Error Boundary Component
 *
 * Catches React rendering errors and displays a fallback UI
 */

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2>Terjadi Kesalahan</h2>
            <p>Maaf, aplikasi mengalami error tak terduga.</p>
            <p className="error-boundary-detail">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <div className="error-boundary-actions">
              <button className="error-boundary-btn primary" onClick={this.handleReset}>
                🔄 Coba Lagi
              </button>
              <button
                className="error-boundary-btn secondary"
                onClick={() => window.location.reload()}
              >
                🔃 Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}