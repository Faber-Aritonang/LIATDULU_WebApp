/**
 * LIATDULU - HistoryPanel Component
 * 
 * Displays user's fitting history
 */

import React, { useState } from 'react';
import useHistory from '../hooks/useHistory.js';
import useAuth from '../hooks/useAuth.js';

export default function HistoryPanel() {
  const { user, isAuthenticated } = useAuth();
  const {
    history,
    loading,
    error,
    hasMore,
    loadMore,
    deleteItem,
    refresh
  } = useHistory();

  // Don't show if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const handleDelete = (historyId) => {
    if (window.confirm('Yakin ingin menghapus riwayat ini?')) {
      deleteItem(historyId);
    }
  };

  if (loading && history.length === 0) {
    return (
      <div className="history-panel">
        <h3>Riwayat Fitting</h3>
        <div className="history-loading">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>Riwayat Fitting</h3>
        {history.length > 0 && (
          <button className="history-refresh" onClick={refresh} disabled={loading}>
            🔄 Refresh
          </button>
        )}
      </div>

      {error && <div className="history-error">{error}</div>}

      {history.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">📭</div>
          <p>Belum ada riwayat fitting</p>
          <p>Buat fitting pertama Anda di halaman utama</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <button className="history-load-more" onClick={loadMore} disabled={loading}>
          {loading ? 'Memuat...' : ' Muat Lebih Banyak'}
        </button>
      )}
    </div>
  );
}

/**
 * Individual history item component
 */
function HistoryItem({ item, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(item.id);
    setDeleting(false);
  };

  return (
    <div className="history-item">
      <div className="history-item-image">
        {item.result_url ? (
          <img src={item.result_url} alt="Hasil fitting" />
        ) : (
          <div className="history-placeholder">No image</div>
        )}
      </div>
      
      <div className="history-item-info">
        <span className="history-ratio">{item.ratio}</span>
        <span className="history-date">
          {new Date(item.created_at).toLocaleDateString('id-ID')}
        </span>
        <span className="history-products">
          {item.product_count} produk
        </span>
      </div>

      <button 
        className="history-delete" 
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Hapus riwayat"
      >
        {deleting ? '⏳' : '🗑️'}
      </button>
    </div>
  );
}