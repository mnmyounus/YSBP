'use client';
import { useRef, useImperativeHandle, forwardRef } from 'react';

export interface BrowserFrameHandle {
  loadUrl: (proxyUrl: string) => void;
  stop: () => void;
}

interface Props {
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

export const BrowserFrame = forwardRef<BrowserFrameHandle, Props>(
  ({ onLoadStart, onLoadEnd }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useImperativeHandle(ref, () => ({
      loadUrl(proxyUrl: string) {
        if (!iframeRef.current) return;
        onLoadStart?.();
        iframeRef.current.src = proxyUrl;
      },
      stop() {
        if (!iframeRef.current) return;
        // Temporarily clear src to stop loading
        const src = iframeRef.current.src;
        iframeRef.current.src = 'about:blank';
        void src; // preserve for potential restore
      },
    }));

    return (
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          id="browser-frame"
          src="about:blank"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          referrerPolicy="no-referrer"
          title="YSPB Sandboxed Browser"
          onLoad={onLoadEnd}
          style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
        />
        {/* Overlay to intercept clicks when needed */}
        <div
          id="frame-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'none',
            cursor: 'not-allowed',
          }}
        />
      </div>
    );
  }
);

BrowserFrame.displayName = 'BrowserFrame';
