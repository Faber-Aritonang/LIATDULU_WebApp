/**
 * LIATDULU - Result Canvas Component
 * 
 * Displays the generated fitting result with controls
 */

import React, { useState, useRef, useEffect } from 'react';

/**
 * ResultCanvas - Shows the fitting result image with zoom/pan controls
 * 
 * @param {Object} props
 * @param {string} props.imageUrl - URL or data URL of the result image
 * @param {Function} props.onRegenerate - Callback to regenerate
 * @param {Function} props.onDownload - Callback to download
 */
export default function ResultCanvas({ imageUrl, onRegenerate, onDownload }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    // Reset zoom when new image loads
    if (imageUrl) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [imageUrl]);

  const handleCanvasWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.max(0.5, Math.min(5, scale + delta));
    setScale(newScale);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPosition({
      x: position.x + dx,
      y: position.y + dy
    });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const renderImage = () => {
    if (!canvasRef.current || !imgRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const { width, height } = canvasRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply transform
    ctx.save();
    ctx.translate(width / 2 + position.x * scale, height / 2 + position.y * scale);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    // Draw image
    const img = imgRef.current;
    ctx.drawImage(img, 0, 0, width, height);
    ctx.restore();
  };

  if (!imageUrl) {
    return (
      <div className="result-canvas empty">
        <div className="empty-state">
          <div className="empty-icon">🎨</div>
          <h3>Hasil akan ditampilkan di sini</h3>
          <p>Unduh foto model dan produk untuk memulai</p>
        </div>
      </div>
    );
  }

  return (
    <div className="result-container">
      <div className="result-controls">
        <button className="control-button" onClick={onRegenerate} aria-label="Hasil ulang">
          🔄 Regenerate
        </button>
        <button className="control-button" onClick={onDownload} aria-label="Unduh">
          ⬇️ Unduh
        </button>
        <button 
          className="control-button" 
          onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
          aria-label="Reset zoom"
        >
          🔍 Reset
        </button>
      </div>

      <div
        className="result-canvas-container"
        onWheel={handleCanvasWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          className="result-canvas"
          width={800}
          height={1200}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Hasil fitting"
          onLoad={() => renderImage()}
          style={{ display: 'none' }}
        />
      </div>

      <div className="zoom-controls">
        <button onClick={() => setScale(Math.max(0.5, scale - 0.1))}>-</button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(Math.min(5, scale + 0.1))}>+</button>
      </div>
    </div>
  );
}