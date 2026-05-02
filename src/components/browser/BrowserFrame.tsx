'use client';
import { useRef, useImperativeHandle, forwardRef, useState } from 'react';

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
    // key forces React to remount the iframe, guaranteeing a real navigation
    const [frameKey, setFrameKey] = useState(0);
    const [src, setSrc] = useState('about:blank');

    useImperativeHandle(ref, () => ({
      loadUrl(proxyUrl: string) {
        onLoadStart?.();
        setSrc(proxyUrl);
        // Increment key to force remount — this is the fix for "page not showing"
        setFrameKey(k => k + 1);
      },
      stop() {
        setSrc('about:blank');
        setFrameKey(k => k + 1);
        onLoadEnd?.();
      },
    }));

    return (
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#fff' }}>
        <iframe
          key={frameKey}
          ref={iframeRef}
          id="browser-frame"
          src={src}
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          title="YSPB Sandboxed Browser"
          onLoad={onLoadEnd}
          style={{ width: '100%', height: '100%', border: 'none', background: '#fff', display: 'block' }}
        />
      </div>
    );
  }
);

BrowserFrame.displayName = 'BrowserFrame';
