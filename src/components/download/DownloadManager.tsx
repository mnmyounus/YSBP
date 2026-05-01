'use client';
import type { DownloadJob } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatBytes } from '@/lib/url-utils';

interface Props {
  jobs: DownloadJob[];
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
}

function statusLabel(job: DownloadJob): string {
  switch (job.status) {
    case 'scanning': return '🔍 Scanning…';
    case 'downloading': return `↓ ${job.progress >= 0 ? `${job.progress}%` : 'Downloading…'}`;
    case 'completed': return '✓ Done';
    case 'blocked': return '✗ Blocked';
    case 'error': return `✗ ${job.error ?? 'Error'}`;
    case 'paused': return '⏸ Paused';
    default: return '…';
  }
}

function statusColor(job: DownloadJob): string {
  switch (job.status) {
    case 'completed': return 'var(--green)';
    case 'blocked':
    case 'error': return 'var(--red)';
    case 'scanning': return 'var(--amber)';
    case 'downloading': return 'var(--accent)';
    default: return 'var(--text-secondary)';
  }
}

export function DownloadManager({ jobs, onRemove, onClearCompleted }: Props) {
  if (jobs.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        No downloads yet.<br />
        <span style={{ fontSize: 11 }}>Use the 📡 SNIFF button to detect media assets.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
          DOWNLOADS ({jobs.length})
        </span>
        <button className="btn-ghost" onClick={onClearCompleted} style={{ fontSize: 10, padding: '2px 8px' }}>
          CLEAR DONE
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {jobs.map((job) => (
          <div
            key={job.id}
            className="animate-fade-up"
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border)',
              position: 'relative',
            }}
          >
            {/* Filename + controls */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                  {job.asset.filename}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: statusColor(job) }}>
                    {statusLabel(job)}
                  </span>
                  {job.scanResult && (
                    <StatusBadge verdict={job.scanResult.verdict} score={job.scanResult.score} />
                  )}
                  {job.asset.size !== null && (
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{formatBytes(job.asset.size)}</span>
                  )}
                </div>
              </div>
              <button
                className="btn-ghost"
                onClick={() => onRemove(job.id)}
                style={{ padding: '2px 6px', fontSize: 11, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Progress bar */}
            {(job.status === 'downloading' || job.status === 'scanning') && (
              <div className="progress-bar-track" style={{ marginTop: 6 }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: job.status === 'scanning' ? '100%' : `${Math.max(job.progress, 2)}%`,
                    background: job.status === 'scanning' ? 'var(--amber)' : 'var(--accent)',
                    transition: job.status === 'scanning' ? 'none' : undefined,
                    animation: job.status === 'scanning' ? 'progress-pulse 1.5s ease-in-out infinite' : undefined,
                  }}
                />
              </div>
            )}

            {/* Scan detections */}
            {job.scanResult?.detections && job.scanResult.detections.length > 0 && (
              <div style={{ marginTop: 6, padding: '6px 8px', background: job.scanResult.verdict === 'malicious' ? 'rgba(255,51,102,0.08)' : 'rgba(255,170,0,0.08)', borderRadius: 4, borderLeft: `2px solid ${job.scanResult.verdict === 'malicious' ? 'var(--red)' : 'var(--amber)'}` }}>
                {job.scanResult.detections.slice(0, 3).map((d, i) => (
                  <div key={i} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: 2 }}>{d}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes progress-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
