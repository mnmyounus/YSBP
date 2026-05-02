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

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 8px',
      background: 'var(--panel-2)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* Security dot */}
      {currentUrl && (
        <span
          title={isSecure ? 'Secure HTTPS' : 'Insecure HTTP'}
          style={{
            fontSize: 16,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          {isSecure ? '🔒' : '⚠️'}
        </span>
      )}

      {/* URL input */}
      <input
        className="yspb-input"
        style={{ minWidth: 0, flex: 1, fontSize: 13, padding: '7px 10px' }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onFocus={(e) => e.target.select()}
        placeholder="Search or enter URL…"
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        inputMode="url"
      />

      {/* Stop / Go */}
      {loading ? (
        <button className="btn-ghost" onClick={onStop} style={{ fontSize: 12, padding: '6px 10px', flexShrink: 0 }}>
          ✕
        </button>
      ) : (
        <button className="btn-primary" onClick={handleGo} style={{ fontSize: 13, padding: '6px 14px', flexShrink: 0 }}>
          GO
        </button>
      )}

      {/* Sniff button */}
      <button
        className="btn-ghost"
        onClick={onSniff}
        disabled={!currentUrl}
        title="Sniff media assets"
        style={{ fontSize: 12, padding: '6px 10px', flexShrink: 0, opacity: currentUrl ? 1 : 0.35 }}
      >
        📡
      </button>
    </div>
  );
}
