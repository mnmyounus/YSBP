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

const MIME_ICON: Record<string, string> = {
  'video': '🎬',
  'audio': '🎵',
  'image': '🖼',
  'application/pdf': '📄',
  'application/zip': '📦',
  'application': '📦',
};

function getMimeIcon(mime: string): string {
  if (mime.startsWith('video')) return MIME_ICON.video;
  if (mime.startsWith('audio')) return MIME_ICON.audio;
  if (mime.startsWith('image')) return MIME_ICON.image;
  return MIME_ICON[mime] ?? MIME_ICON.application;
}

export function MediaSnifferPanel({ result, loading, onDownload, onClose }: Props) {
  const [selected, setSelected] = useState<MediaAsset | null>(null);

  return (
    <div
      className="panel animate-fade-up cyber-corner"
      style={{
        position: 'absolute',
        top: 56,
        right: 12,
        width: 400,
        maxHeight: 600,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--accent)', letterSpacing: '0.1em' }}>
          📡 MEDIA SNIFFER
        </span>
        {result?.pageTitle && (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {result.pageTitle}
          </span>
        )}
        <button className="btn-ghost" onClick={onClose} style={{ padding: '2px 8px', fontSize: 11 }}>✕</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <div style={{ marginBottom: 8, color: 'var(--accent)' }}>⟳ SCANNING PAGE…</div>
            <div>Detecting media streams and download links</div>
          </div>
        )}

        {!loading && result?.error && (
          <div style={{ padding: '12px 14px', color: 'var(--red)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            ✗ {result.error}
          </div>
        )}

        {!loading && result && !result.error && result.assets.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
            No media assets detected on this page.
          </div>
        )}

        {!loading && result?.assets.map((asset) => (
          <div
            key={asset.url}
            onClick={() => setSelected(selected?.url === asset.url ? null : asset)}
            style={{
              padding: '8px 14px',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border)',
              background: selected?.url === asset.url ? 'var(--accent-dim)' : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{getMimeIcon(asset.mimeType)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {asset.filename}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  {asset.format && (
                    <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{asset.format}</span>
                  )}
                  {asset.quality && (
                    <span style={{ fontSize: 10, color: 'var(--purple)', fontFamily: 'var(--font-mono)' }}>{asset.quality}</span>
                  )}
                  {asset.size !== null && (
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{formatBytes(asset.size)}</span>
                  )}
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={(e) => { e.stopPropagation(); onDownload(asset); }}
                style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
              >
                ↓ GET
              </button>
            </div>

            {/* Expanded metadata */}
            {selected?.url === asset.url && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--panel-2)', borderRadius: 4, border: '1px solid var(--border)' }}>
                <MetadataRow label="URL" value={asset.url} mono truncate />
                <MetadataRow label="MIME" value={asset.mimeType} mono />
                <MetadataRow label="Source" value={asset.source} mono />
                {asset.size !== null && <MetadataRow label="Size" value={formatBytes(asset.size)} />}
                {asset.duration && <MetadataRow label="Duration" value={asset.duration} />}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {result && !loading && (
        <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {result.assets.length} asset{result.assets.length !== 1 ? 's' : ''} found
          </span>
        </div>
      )}
    </div>
  );
}

function MetadataRow({ label, value, mono, truncate }: { label: string; value: string; mono?: boolean; truncate?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 3, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', minWidth: 50, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: mono ? 'var(--font-mono)' : undefined, wordBreak: 'break-all', ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 } : {}) }}>
        {value}
      </span>
    </div>
  );
}
