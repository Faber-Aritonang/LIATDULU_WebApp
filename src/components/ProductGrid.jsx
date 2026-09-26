/**
 * LIATDULU - Product Grid Component
 * 
 * Displays grid of product images that can be removed
 */

import React from 'react';
import { MAX_PRODUCTS } from '../lib/constants.js';
import { createPreviewURL, revokePreviewURL } from '../lib/fileHelpers.js';

/**
 * ProductGrid - Displays product images in a grid
 * 
 * @param {Object} props
 * @param {File[]} props.products - Array of product files
 * @param {Function} props.onRemove - Callback to remove a product (index)
 */
export default function ProductGrid({ products, onRemove }) {
  if (!products || products.length === 0) {
    return null;
  }

  const handleRemove = (index) => {
    onRemove && onRemove(index);
  };

  return (
    <div className="product-grid">
      {products.map((product, index) => (
        <ProductItem
          key={`${product.name}-${index}`}
          product={product}
          index={index}
          onRemove={handleRemove}
        />
      ))}

      {products.length < MAX_PRODUCTS && (
        <div className="product-slot empty">
          <span className="slot-hint">+ Tambahkan produk lagi</span>
        </div>
      )}
    </div>
  );
}

/**
 * Individual product item component
 */
function ProductItem({ product, index, onRemove }) {
  const [previewUrl, setPreviewUrl] = React.useState(null);

  React.useEffect(() => {
    let url;
    const loadPreview = async () => {
      try {
        url = URL.createObjectURL(product);
        setPreviewUrl(url);
      } catch (e) {
        console.error('Failed to create preview:', e);
      }
    };
    loadPreview();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [product]);

  return (
    <div className="product-item">
      {previewUrl && (
        <>
          <img
            src={previewUrl}
            alt={`Produk ${index + 1}`}
            className="product-image"
          />
          <button
            className="remove-button"
            onClick={() => onRemove(index)}
            aria-label="Hapus produk"
          >
            ✕
          </button>
        </>
      )}
      <span className="product-label">Produk {index + 1}</span>
    </div>
  );
}