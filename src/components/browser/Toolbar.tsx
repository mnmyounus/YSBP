'use client';
import type { UIMode } from '@/types';

interface Props {
  mode: UIMode;
  onToggleMode: () => void;
  incognito: boolean;
  sessionId: string;
}

export function Toolbar({ mode, onToggleMode, incognito, sessionId }: Props) {
  return (
    <div
      style={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--panel)',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 5,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 900, color: '#000',
          fontFamily: 'var(--font-display)',
        }}>Y</div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
          YSPB
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginLeft: -2 }}>v1.0</span>
      </div>

      {/* Incognito indicator */}
      {incognito && (
        <div className="badge badge-clean" style={{ fontSize: 10 }}>
          🕶 INCOGNITO
        </div>
      )}

      {/* Session ID */}
      <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginLeft: 2 }}>
        SID:{sessionId}
      </span>

      <div style={{ flex: 1 }} />

      {/* Lead dev credit */}
      <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
        by MNM YOUNUS
      </span>

      {/* Theme toggle */}
      <button
        className="btn-ghost"
        onClick={onToggleMode}
        style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
        title="Toggle UI theme"
      >
        {mode === 'cyber' ? '☀ NORMAL' : '⚡ CYBER'}
      </button>
    </div>
  );
}
