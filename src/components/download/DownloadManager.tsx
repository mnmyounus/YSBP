'use client';
import { useEffect, useState } from 'react';
import type { DownloadJob } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatBytes } from '@/lib/url-utils';

interface Props {
  jobs: DownloadJob[];
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
}

function statusColor(status: DownloadJob['status']): string {
  switch (status) {
    case 'completed':  return 'var(--green)';
    case 'blocked':
    case 'error':      return 'var(--red)';
    case 'scanning':   return 'var(--amber)';
    case 'downloading':return 'var(--accent)';
    default:           return 'var(--text-secondary)';
  }
}

function statusIcon(status: DownloadJob['status']): string {
  switch (status) {
    case 'scanning':    return '🔍';
    case 'downloading': return '⬇';
    case 'completed':   return '✓';
    case 'blocked':     return '🚫';
    case 'error':       return '✗';
    default:            return '…';
  }
}

function JobRow({ job, onRemove }: { job: DownloadJob; onRemove: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (job.status !== 'downloading') return;
    const t = setInterval(() => setElapsed(Date.now() - job.startedAt), 500);
    return () => clearInterval(t);
  }, [job.status, job.startedAt]);

  const isActive = job.status === 'downloading' || job.status === 'scanning';
  const indeterminate = job.progress < 0;

  return (
    <div className="animate-fade-up" style={{
      padding: '10px 12px',
      borderBottom: '1px solid var(--border)',
      background: job.status === 'blocked' ? 'rgba(255,51,102,0.04)' :
                  job.status === 'completed' ? 'rgba(0,255,136,0.03)' : 'transparent',
    }}>
      {/* Row 1: icon + name + remove */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>
          {job.status === 'completed' ? '✅' :
           job.status === 'blocked'   ? '🚫' :
           job.status === 'error'     ? '❌' :
           job.status === 'scanning'  ? '🔍' : '⬇️'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {job.asset.filename}
          </div>
          {/* Row 2: status + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: statusColor(job.status), fontFamily: 'var(--font-mono)' }}>
              {statusIcon(job.status)}{' '}
              {job.status === 'downloading' && job.progress >= 0 ? `${job.progress}%` :
               job.status === 'downloading' ? 'Downloading…' :
               job.status === 'scanning'   ? 'Scanning…' :
               job.status === 'completed'  ? 'Done' :
               job.status === 'blocked'    ? 'Blocked — malicious' :
               job.status === 'error'      ? (job.error ?? 'Error') : ''}
            </span>
            {job.asset.size !== null && (
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{formatBytes(job.asset.size)}</span>
            )}
            {job.status === 'downloading' && elapsed > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {Math.round(elapsed / 1000)}s
              </span>
            )}
            {job.scanResult && <StatusBadge verdict={job.scanResult.verdict} score={job.scanResult.score} />}
          </div>
        </div>
        <button
          className="btn-ghost"
          onClick={onRemove}
          style={{ padding: '2px 7px', fontSize: 11, flexShrink: 0 }}
        >✕</button>
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="progress-bar-track" style={{ marginTop: 8 }}>
          <div
            className="progress-bar-fill"
            style={{
              width: indeterminate ? '40%' : `${Math.max(job.progress, 2)}%`,
              background: job.status === 'scanning' ? 'var(--amber)' : 'var(--accent)',
              animation: indeterminate || job.status === 'scanning'
                ? 'progressIndeterminate 1.4s ease-in-out infinite'
                : undefined,
            }}
          />
        </div>
      )}

      {/* Scan detections */}
      {job.scanResult?.detections && job.scanResult.detections.length > 0 && (
        <div style={{
          marginTop: 7, padding: '6px 8px',
          background: job.scanResult.verdict === 'malicious'
            ? 'rgba(255,51,102,0.08)' : 'rgba(255,170,0,0.07)',
          borderRadius: 4,
          borderLeft: `2px solid ${job.scanResult.verdict === 'malicious' ? 'var(--red)' : 'var(--amber)'}`,
        }}>
          {job.scanResult.detections.slice(0, 3).map((d, i) => (
            <div key={i} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{d}</div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes progressIndeterminate {
          0%   { margin-left: 0%;   width: 30%; }
          50%  { margin-left: 40%;  width: 40%; }
          100% { margin-left: 100%; width: 20%; }
        }
      `}</style>
    </div>
  );
}

export function DownloadManager({ jobs, onRemove, onClearCompleted }: Props) {
  const active = jobs.filter(j => j.status === 'downloading' || j.status === 'scanning').length;

  if (jobs.length === 0) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📥</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', lineHeight: 1.7 }}>
          No downloads yet.<br />
          Navigate to a page and tap<br />
          <span style={{ color: 'var(--accent)' }}>📡</span> to sniff media assets.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
          {active > 0 ? `⬇ ${active} ACTIVE` : `DOWNLOADS (${jobs.length})`}
        </span>
        <button className="btn-ghost" onClick={onClearCompleted} style={{ fontSize: 10, padding: '2px 8px' }}>
          CLEAR DONE
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {jobs.map(job => (
          <JobRow key={job.id} job={job} onRemove={() => onRemove(job.id)} />
        ))}
      </div>
    </div>
  );
}
