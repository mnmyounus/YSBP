'use client';
import { useState } from 'react';
import type { SniffResult, MediaAsset } from '@/types';
import { formatBytes } from '@/lib/url-utils';

interface Props {
  result: SniffResult | null;
  loading: boolean;
  onDownload: (asset: MediaAsset) => void;
  onClose: () => void;
}

const MIME_ICON = (mime: string) => {
  if (mime.startsWith('video')) return '🎬';
  if (mime.startsWith('audio')) return '🎵';
  if (mime.startsWith('image')) return '🖼';
  if (mime.includes('pdf'))    return '📄';
  return '📦';
};

export function MediaSnifferPanel({ result, loading, onDownload, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--panel)',
      border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--panel-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--accent)', letterSpacing: '0.1em' }}>
            📡 MEDIA SNIFFER
          </span>
          {result?.pageTitle && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              — {result.pageTitle}
            </span>
          )}
        </div>
        <button className="btn-ghost" onClick={onClose} style={{ padding: '4px 10px', fontSize: 12 }}>✕ CLOSE</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <div style={{ color: 'var(--accent)', fontSize: 14, marginBottom: 8 }}>⟳ SCANNING PAGE…</div>
            <div>Detecting media streams and download links</div>
          </div>
        )}

        {!loading && result?.error && (
          <div style={{ padding: '16px 14px', color: 'var(--red)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            ✗ {result.error}
          </div>
        )}

        {!loading && result && !result.error && result.assets.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
            No media assets detected on this page.
          </div>
        )}

        {!loading && result?.assets.map((asset) => (
          <div
            key={asset.url}
            onClick={() => setSelected(selected === asset.url ? null : asset.url)}
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--border)',
              background: selected === asset.url ? 'var(--accent-dim)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{MIME_ICON(asset.mimeType)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {asset.filename}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  {asset.format && <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{asset.format}</span>}
                  {asset.quality && <span style={{ fontSize: 10, color: 'var(--purple)', fontFamily: 'var(--font-mono)' }}>{asset.quality}</span>}
                  {asset.size !== null && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{formatBytes(asset.size)}</span>}
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={(e) => { e.stopPropagation(); onDownload(asset); }}
                style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }}
              >
                ↓ GET
              </button>
            </div>

            {selected === asset.url && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--panel-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                <MetaRow label="URL"    value={asset.url}      truncate />
                <MetaRow label="MIME"   value={asset.mimeType} />
                <MetaRow label="SOURCE" value={asset.source}   />
                {asset.size !== null && <MetaRow label="SIZE" value={formatBytes(asset.size)} />}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {result && !loading && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--panel-2)', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {result.assets.length} asset{result.assets.length !== 1 ? 's' : ''} detected
          </span>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', minWidth: 48, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 } : {}) }}>
        {value}
      </span>
    </div>
  );
}
