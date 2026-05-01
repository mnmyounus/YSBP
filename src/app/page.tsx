'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Toolbar } from '@/components/browser/Toolbar';
import { AddressBar } from '@/components/browser/AddressBar';
import { BrowserFrame, type BrowserFrameHandle } from '@/components/browser/BrowserFrame';
import { Sidebar } from '@/components/browser/Sidebar';
import { MediaSnifferPanel } from '@/components/download/MediaSnifferPanel';
import { useTheme } from '@/hooks/useTheme';
import { useDownloadManager } from '@/hooks/useDownloadManager';
import { normalizeUrl } from '@/lib/url-utils';
import { UA_PROFILES, DEFAULT_PROFILE_KEY } from '@/lib/ua-profiles';
import type { SniffResult } from '@/types';

function generateSessionId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Home() {
  const { mode, toggle: toggleMode } = useTheme();
  const { jobs, addJob, removeJob, clearCompleted } = useDownloadManager();

  const [currentUrl, setCurrentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [incognito, setIncognito] = useState(true);
  const [proxyEnabled, setProxyEnabled] = useState(true);
  const [uaKey] = useState(DEFAULT_PROFILE_KEY);
  const [sessionId] = useState(generateSessionId);

  const [sniffLoading, setSniffLoading] = useState(false);
  const [sniffResult, setSniffResult] = useState<SniffResult | null>(null);
  const [sniffOpen, setSniffOpen] = useState(false);

  const frameRef = useRef<BrowserFrameHandle>(null);

  const navigate = useCallback(
    (rawUrl: string) => {
      const url = normalizeUrl(rawUrl);
      if (!url) return;
      setCurrentUrl(url);
      setSniffOpen(false);
      setSniffResult(null);

      const target = proxyEnabled ? `/api/proxy?url=${encodeURIComponent(url)}&ua=${encodeURIComponent(uaKey)}` : url;
      frameRef.current?.loadUrl(target);
    },
    [proxyEnabled, uaKey]
  );

  const handleSniff = useCallback(async () => {
    if (!currentUrl) return;
    setSniffOpen(true);
    setSniffLoading(true);
    setSniffResult(null);
    try {
      const res = await fetch('/api/sniff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl, ua: uaKey }),
      });
      const data: SniffResult = await res.json();
      setSniffResult(data);
    } catch (err) {
      setSniffResult({ ok: false, assets: [], pageTitle: '', error: 'Sniff request failed' });
    } finally {
      setSniffLoading(false);
    }
  }, [currentUrl, uaKey]);

  // Session reset when incognito is toggled
  const handleToggleIncognito = useCallback(() => {
    setIncognito((v) => !v);
    setCurrentUrl('');
    frameRef.current?.loadUrl('about:blank');
  }, []);

  const spoofedUA = UA_PROFILES[uaKey]?.['User-Agent'] ?? 'Unknown';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      {/* Top toolbar */}
      <Toolbar
        mode={mode}
        onToggleMode={toggleMode}
        incognito={incognito}
        sessionId={sessionId}
      />

      {/* Address bar */}
      <AddressBar
        currentUrl={currentUrl}
        loading={loading}
        onNavigate={navigate}
        onSniff={handleSniff}
        onStop={() => { frameRef.current?.stop(); setLoading(false); }}
      />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Browser frame area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* Empty state */}
          {!currentUrl && (
            <EmptyState onNavigate={navigate} />
          )}

          <BrowserFrame
            ref={frameRef}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
          />

          {/* Media sniffer panel */}
          {sniffOpen && (
            <MediaSnifferPanel
              result={sniffResult}
              loading={sniffLoading}
              onDownload={(asset) => { addJob(asset); setSniffOpen(false); }}
              onClose={() => setSniffOpen(false)}
            />
          )}
        </div>

        {/* Sidebar */}
        <Sidebar
          jobs={jobs}
          onRemove={removeJob}
          onClearCompleted={clearCompleted}
          incognito={incognito}
          onToggleIncognito={handleToggleIncognito}
          spoofedUA={spoofedUA}
          proxyEnabled={proxyEnabled}
          onToggleProxy={() => setProxyEnabled((v) => !v)}
        />
      </div>
    </div>
  );
}

function EmptyState({ onNavigate }: { onNavigate: (url: string) => void }) {
  const quickLinks = [
    { label: 'DuckDuckGo', url: 'https://duckduckgo.com' },
    { label: 'Wikipedia', url: 'https://en.wikipedia.org' },
    { label: 'HackerNews', url: 'https://news.ycombinator.com' },
    { label: 'Archive.org', url: 'https://archive.org' },
  ];

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5,
      background: 'var(--bg)',
      gap: 32,
    }}>
      {/* Logo mark */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 16,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, fontWeight: 900,
          fontFamily: 'var(--font-display)',
          color: '#000',
          margin: '0 auto 16px',
          boxShadow: '0 0 32px var(--accent-glow)',
        }}>Y</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-primary)' }}>
          YSPB
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
          YOUR SECURITY & PRIVACY BROWSER
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
          by MNM YOUNUS · AGPL-3.0
        </div>
      </div>

      {/* Feature pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 480 }}>
        {[
          '🛡 Anti-Fingerprinting',
          '🕶 Incognito by Default',
          '📡 Media Sniffer',
          '🔬 Malware Shield',
          '🔒 Header Spoofing',
          '↓ 1DM-Style Downloads',
        ].map((f) => (
          <span key={f} className="badge badge-unknown" style={{ fontSize: 11, padding: '4px 10px' }}>{f}</span>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>QUICK NAVIGATE</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {quickLinks.map((l) => (
            <button key={l.url} className="btn-ghost" onClick={() => onNavigate(l.url)} style={{ fontSize: 12 }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
