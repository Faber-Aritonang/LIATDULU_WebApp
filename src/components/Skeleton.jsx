/**
 * LIATDULU - Skeleton Loading Components
 *
 * Placeholder loading states for better UX
 */

import React from 'react';

/**
 * Base skeleton element with shimmer animation
 */
function SkeletonBlock({ width, height, borderRadius, style }) {
  return (
    <div
      className="skeleton-block"
      style={{
        width: width || '100%',
        height: height || '16px',
        borderRadius: borderRadius || '8px',
        ...style
      }}
    />
  );
}

/**
 * Upload zone skeleton
 */
export function UploadZoneSkeleton() {
  return (
    <div className="skeleton-upload">
      <SkeletonBlock height="200px" borderRadius="12px" />
    </div>
  );
}

/**
 * Product grid skeleton
 */
export function ProductGridSkeleton({ count = 3 }) {
  return (
    <div className="skeleton-product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock
          key={i}
          height="0"
          style={{ paddingBottom: '100%', borderRadius: '8px' }}
        />
      ))}
    </div>
  );
}

/**
 * Result canvas skeleton
 */
export function ResultCanvasSkeleton() {
  return (
    <div className="skeleton-result">
      <div className="skeleton-result-controls">
        <SkeletonBlock width="100px" height="36px" />
        <SkeletonBlock width="100px" height="36px" />
        <SkeletonBlock width="100px" height="36px" />
      </div>
      <SkeletonBlock height="400px" borderRadius="12px" />
    </div>
  );
}

/**
 * History list skeleton
 */
export function HistorySkeleton({ count = 3 }) {
  return (
    <div className="skeleton-history">
      <SkeletonBlock width="140px" height="20px" style={{ marginBottom: '16px' }} />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-history-item">
          <SkeletonBlock width="56px" height="56px" borderRadius="8px" />
          <div className="skeleton-history-info">
            <SkeletonBlock width="60px" height="14px" />
            <SkeletonBlock width="100px" height="12px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonBlock;