'use client';
import { useRef, useImperativeHandle, forwardRef, useState } from 'react';

export interface BrowserFrameHandle {
  loadUrl: (url: string) => void;
  stop: () => void;
}

interface Props {
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

export const BrowserFrame = forwardRef<BrowserFrameHandle, Props>(
  ({ onLoadStart, onLoadEnd }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [frameKey, setFrameKey] = useState(0);
    const [src, setSrc] = useState('about:blank');

    useImperativeHandle(ref, () => ({
      loadUrl(url: string) {
        onLoadStart?.();
        setSrc(url);
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
          title="YSPB Browser"
          onLoad={onLoadEnd}
          onError={onLoadEnd}
          allow="autoplay; fullscreen"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#fff',
            display: 'block',
          }}
        />
      </div>
    );
  }
);

BrowserFrame.displayName = 'BrowserFrame';
