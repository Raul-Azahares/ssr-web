'use client';

import React, { useState } from 'react';
import styles from './UrlInput.module.css';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  error: string;
}

export function UrlInput({ onSubmit, isLoading, error }: UrlInputProps) {
  const [inputUrl, setInputUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onSubmit(inputUrl.trim());
    }
  };

  return (
    <div className={styles.urlInputContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="https://example.com"
            className={styles.input}
            disabled={isLoading}
            required
          />
          <button 
            type="submit" 
            className={styles.button}
            disabled={isLoading || !inputUrl.trim()}
          >
            {isLoading ? '🔄' : '🛡️'} Protect
          </button>
        </div>
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}
      </form>
      
      <div className={styles.features}>
        <h3>Protection Features:</h3>
        <ul>
          <li>🚫 Right-click blocking</li>
          <li>🚫 Text selection disabled</li>
          <li>🚫 Page download prevention</li>
          <li>🖼️ Rendered as protected image</li>
          <li>🔒 Protection against code inspection</li>
        </ul>
      </div>
    </div>
  );
}
