'use client';
import { useState, KeyboardEvent } from 'react';
import { normalizeUrl, extractDomain } from '@/lib/url-utils';

interface Props {
  currentUrl: string;
  loading: boolean;
  onNavigate: (url: string) => void;
  onSniff: () => void;
  onStop: () => void;
}

export function AddressBar({ currentUrl, loading, onNavigate, onSniff, onStop }: Props) {
  const [input, setInput] = useState(currentUrl);

  const handleGo = () => {
    const url = normalizeUrl(input.trim());
    if (url) onNavigate(url);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleGo();
  };

  const isSecure = currentUrl.startsWith('https://');
  const domain = currentUrl ? extractDomain(currentUrl) : '';

  return (
    <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--border)' }}>
      {/* Security indicator */}
      <div
        className="flex items-center gap-1 px-2 py-1 rounded"
        style={{
          background: currentUrl ? (isSecure ? 'rgba(0,255,136,0.1)' : 'rgba(255,170,0,0.1)') : 'transparent',
          border: currentUrl ? `1px solid ${isSecure ? 'rgba(0,255,136,0.25)' : 'rgba(255,170,0,0.25)'}` : 'none',
          minWidth: 80,
        }}
      >
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: currentUrl ? (isSecure ? 'var(--green)' : 'var(--amber)') : 'var(--text-dim)' }}>
          {currentUrl ? (isSecure ? '🔒 HTTPS' : '⚠ HTTP') : '⬤ IDLE'}
        </span>
      </div>

      {/* URL input */}
      <input
        className="yspb-input flex-1"
        style={{ minWidth: 0 }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onFocus={(e) => e.target.select()}
        placeholder="Enter URL or search query…"
        spellCheck={false}
        autoComplete="off"
      />

      {/* Controls */}
      {loading ? (
        <button className="btn-ghost" onClick={onStop} title="Stop loading">
          ✕ STOP
        </button>
      ) : (
        <button className="btn-primary" onClick={handleGo}>
          GO →
        </button>
      )}

      <button
        className="btn-ghost"
        onClick={onSniff}
        disabled={!currentUrl}
        title="Sniff media assets from this page"
        style={{ opacity: currentUrl ? 1 : 0.4 }}
      >
        📡 SNIFF
      </button>
    </div>
  );
}
