/**
 * LIATDULU - Ratio Selector Component
 * 
 * Allows user to select output aspect ratio
 */

import React from 'react';
import { RATIO_OPTIONS } from '../lib/constants.js';

/**
 * RatioSelector - Aspect ratio selection buttons
 * 
 * @param {Object} props
 * @param {string} props.value - Currently selected ratio
 * @param {Function} props.onChange - Callback when ratio changes
 */
export default function RatioSelector({ value, onChange }) {
  return (
    <div className="ratio-selector">
      <h3>Pilih Rasio Output</h3>
      <div className="ratio-options">
        {RATIO_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`ratio-option ${value === option.value ? 'selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <span className="ratio-icon">{option.icon}</span>
            <span className="ratio-label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}