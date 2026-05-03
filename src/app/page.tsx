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
import { UA_PROFILES, getSessionUA, rotateUA } from '@/lib/ua-profiles';
import type { SniffResult } from '@/types';

function generateSessionId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Home() {
  const { mode, toggle: toggleMode } = useTheme();
  const { jobs, addJob, removeJob, clearCompleted } = useDownloadManager();

  const [currentUrl, setCurrentUrl] = useState('');
  const [displayUrl, setDisplayUrl] = useState(''); // shown in address bar
  const [loading, setLoading] = useState(false);
  const [incognito, setIncognito] = useState(true);
  const [uaKey, setUaKey] = useState('Firefox/Linux');
  const [sessionId] = useState(generateSessionId);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sniffLoading, setSniffLoading] = useState(false);
  const [sniffResult, setSniffResult] = useState<SniffResult | null>(null);
  const [sniffOpen, setSniffOpen] = useState(false);

  const frameRef = useRef<BrowserFrameHandle>(null);

  useEffect(() => { setUaKey(getSessionUA()); }, []);

  const navigate = useCallback((rawUrl: string) => {
    const url = normalizeUrl(rawUrl);
    if (!url) return;
    setCurrentUrl(url);
    setDisplayUrl(url);
    setSniffOpen(false);
    setSniffResult(null);
    setSidebarOpen(false);
    setLoading(true);

    const nextUA = rotateUA();
    setUaKey(nextUA);

    // Load URL DIRECTLY in iframe — no proxy — for real live page view
    frameRef.current?.loadUrl(url);
  }, []);

  const handleSniff = useCallback(async () => {
    if (!currentUrl) return;
    setSniffOpen(true);
    setSidebarOpen(false);
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
    } catch {
      setSniffResult({ ok: false, assets: [], pageTitle: '', error: 'Sniff failed. Check your connection.' });
    } finally {
      setSniffLoading(false);
    }
  }, [currentUrl, uaKey]);

  const handleToggleIncognito = useCallback(() => {
    setIncognito(v => !v);
    setCurrentUrl('');
    setDisplayUrl('');
    frameRef.current?.loadUrl('about:blank');
  }, []);

  const spoofedUA = UA_PROFILES[uaKey]?.['User-Agent'] ?? 'Unknown';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <Toolbar
        mode={mode}
        onToggleMode={toggleMode}
        incognito={incognito}
        sessionId={sessionId}
        uaKey={uaKey}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        sidebarOpen={sidebarOpen}
        jobCount={jobs.filter(j => j.status === 'downloading' || j.status === 'scanning').length}
      />

      <AddressBar
        currentUrl={displayUrl}
        loading={loading}
        onNavigate={navigate}
        onSniff={handleSniff}
        onStop={() => { frameRef.current?.stop(); setLoading(false); }}
      />

      {/* Loading bar */}
      {loading && (
        <div style={{ height: 2, background: 'var(--border)', flexShrink: 0 }}>
          <div style={{
            height: '100%',
            background: 'var(--accent)',
            animation: 'loadingBar 2s ease-in-out infinite',
            boxShadow: '0 0 8px var(--accent-glow)',
          }} />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Browser + sniff overlay */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {!currentUrl && <EmptyState onNavigate={navigate} />}

          <BrowserFrame
            ref={frameRef}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
          />

          {sniffOpen && (
            <MediaSnifferPanel
              result={sniffResult}
              loading={sniffLoading}
              onDownload={(asset) => { addJob(asset); setSniffOpen(false); }}
              onClose={() => setSniffOpen(false)}
            />
          )}
        </div>

        {/* Sidebar overlay */}
        {sidebarOpen && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          width: 'min(300px, 92vw)',
          zIndex: 41,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s ease',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Sidebar
            jobs={jobs}
            onRemove={removeJob}
            onClearCompleted={clearCompleted}
            incognito={incognito}
            onToggleIncognito={handleToggleIncognito}
            spoofedUA={spoofedUA}
            uaKey={uaKey}
            proxyEnabled={false}
            onToggleProxy={() => {}}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      <style>{`
        @keyframes loadingBar {
          0%   { width: 0%;   margin-left: 0; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [query, setQuery] = useState('');

  const quickLinks = [
    { label: '🦆 DuckDuckGo', url: 'https://duckduckgo.com' },
    { label: '📖 Wikipedia',  url: 'https://en.wikipedia.org' },
    { label: '📰 HackerNews', url: 'https://news.ycombinator.com' },
    { label: '🎬 YouTube',    url: 'https://youtube.com' },
    { label: '📦 Archive.org',url: 'https://archive.org' },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 5,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', gap: 24, overflowY: 'auto',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 14,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 900,
          fontFamily: 'var(--font-display)', color: '#000',
          margin: '0 auto 12px',
          boxShadow: '0 0 28px var(--accent-glow)',
        }}>Y</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>YSPB</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>YOUR SECURITY & PRIVACY BROWSER</div>
      </div>

      {/* Search box */}
      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="yspb-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && query.trim() && onNavigate(query.trim())}
            placeholder="Search anything or enter a URL…"
            autoFocus
            style={{ fontSize: 16, padding: '12px 14px' }}
          />
          <button
            className="btn-primary"
            onClick={() => query.trim() && onNavigate(query.trim())}
            style={{ fontSize: 14, padding: '0 22px', flexShrink: 0 }}
          >GO</button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 6, textAlign: 'center' }}>
          Type anything to search DuckDuckGo · or enter a full URL
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 440 }}>
        {quickLinks.map(l => (
          <button key={l.url} className="btn-ghost" onClick={() => onNavigate(l.url)} style={{ fontSize: 12 }}>
            {l.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 380 }}>
        {['🛡 Anti-Fingerprint', '🔄 Random UA', '📡 Media Sniffer', '🔬 Malware Shield'].map(f => (
          <span key={f} className="badge badge-unknown" style={{ fontSize: 10, padding: '3px 8px' }}>{f}</span>
        ))}
      </div>
    </div>
  );
}
