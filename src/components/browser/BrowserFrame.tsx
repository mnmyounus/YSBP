'use client';
import { useImperativeHandle, forwardRef, useState } from 'react';

export interface BrowserFrameHandle {
  loadUrl: (url: string) => void;
  stop: () => void;
}

interface Props {
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  currentUrl?: string;
}

export const BrowserFrame = forwardRef<BrowserFrameHandle, Props>(
  ({ onLoadStart, onLoadEnd, currentUrl }, ref) => {
    const [opened, setOpened] = useState(false);

    useImperativeHandle(ref, () => ({
      loadUrl(url: string) {
        onLoadStart?.();
        // Open in new tab — the only reliable way to view modern sites
        window.open(url, '_blank', 'noopener');
        setOpened(true);
        setTimeout(() => onLoadEnd?.(), 500);
      },
      stop() {
        onLoadEnd?.();
      },
    }));

    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 24,
        gap: 20,
        textAlign: 'center',
      }}>
        {currentUrl ? (
          <>
            <div style={{ fontSize: 40 }}>🌐</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Page opened in new tab
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', maxWidth: 340, lineHeight: 1.7 }}>
              Modern sites block embedding. YSPB opened the page in your browser.
              <br />Come back here to use <span style={{ color: 'var(--accent)' }}>📡 SNIFF</span> to grab media from it.
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)',
              padding: '6px 12px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              maxWidth: 360,
              wordBreak: 'break-all',
              background: 'var(--accent-dim)',
            }}>
              {currentUrl}
            </div>
            <button
              className="btn-primary"
              onClick={() => window.open(currentUrl, '_blank', 'noopener')}
              style={{ fontSize: 13 }}
            >
              🔗 Reopen Page
            </button>
          </>
        ) : (
          <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Enter a URL above to begin
          </div>
        )}
      </div>
    );
  }
);

BrowserFrame.displayName = 'BrowserFrame';
