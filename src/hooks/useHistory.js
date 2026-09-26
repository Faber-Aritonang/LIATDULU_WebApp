/**
 * LIATDULU - useHistory Hook
 * 
 * Manages fitting history data
 */

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../lib/constants.js';

export default function useHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  /**
   * Fetch history from API
   */
  const fetchHistory = useCallback(async (pageNum = 1, refresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const limit = 20;
      const offset = (pageNum - 1) * limit;
      
      const response = await fetch(`${API_ENDPOINTS.HISTORY}?limit=${limit}&offset=${offset}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch history');
      }

      const data = await response.json();

      if (refresh) {
        setHistory(data.data || []);
      } else {
        setHistory(prev => [...prev, ...(data.data || [])]);
      }

      setHasMore(data.meta?.hasMore || false);
      setPage(pageNum);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load more history items
   */
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    fetchHistory(page + 1);
  }, [loading, hasMore, page, fetchHistory]);

  /**
   * Delete a history item
   */
  const deleteItem = useCallback(async (historyId) => {
    try {
      const response = await fetch(API_ENDPOINTS.HISTORY_DELETE(historyId), {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete history');
      }

      // Optimistically remove from state
      setHistory(prev => prev.filter(item => item.id !== historyId));
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * Refresh history
   */
  const refresh = useCallback(() => {
    setPage(1);
    fetchHistory(1, true);
  }, [fetchHistory]);

  // Fetch on mount
  useEffect(() => {
    fetchHistory(1, true);
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    hasMore,
    loadMore,
    deleteItem,
    refresh
  };
}