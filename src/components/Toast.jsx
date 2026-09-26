/**
 * LIATDULU - Toast Notification Component
 * 
 * Displays success/error notifications to the user
 */

import React, { useEffect, useState } from 'react';

/**
 * Toast - Notification display component
 * 
 * @param {Object} props
 * @param {string} props.message - Message to display
 * @param {'success'|'error'|'info'} props.type - Toast type
 * @param {number} [props.duration=5000] - Auto-dismiss duration in ms
 * @param {Function} props.onDismiss - Callback when toast is dismissed
 */
export default function Toast({ message, type = 'info', duration = 5000, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss && onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">
        {type === 'success' && '✓'}
        {type === 'error' && '✕'}
        {type === 'info' && 'ℹ'}
      </div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={() => setVisible(false)}>
        ✕
      </button>
    </div>
  );
}

/**
 * Toast Container - Manages multiple toasts
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Expose methods globally
  React.useEffect(() => {
    window.__liatduluToasts = {
      success: (msg, dur) => addToast(msg, 'success', dur),
      error: (msg, dur) => addToast(msg, 'error', dur),
      info: (msg, dur) => addToast(msg, 'info', dur),
      remove: removeToast
    };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          duration={t.duration}
          onDismiss={() => removeToast(t.id)}
        />
      ))}
    </div>
  );
}