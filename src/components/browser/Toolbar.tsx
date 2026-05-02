'use client';
import type { UIMode } from '@/types';

interface Props {
  mode: UIMode;
  onToggleMode: () => void;
  incognito: boolean;
  sessionId: string;
  uaKey: string;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  jobCount: number;
}

const UA_ICONS: Record<string, string> = {
  'Chrome/Windows': '🪟',
  'Firefox/Linux': '🐧',
  'Safari/macOS': '🍎',
  'Googlebot': '🤖',
  'Mobile/Android': '📱',
};

export function Toolbar({ mode, onToggleMode, incognito, sessionId, uaKey, onToggleSidebar, sidebarOpen, jobCount }: Props) {
  return (
    <div style={{
      height: 44,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 10px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--panel)',
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 900, color: '#000',
          fontFamily: 'var(--font-display)', flexShrink: 0,
        }}>Y</div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
          YSPB
        </span>
      </div>

      {/* Incognito badge */}
      {incognito && (
        <span className="badge badge-clean" style={{ fontSize: 9, padding: '2px 6px', flexShrink: 0 }}>
          🕶 INC
        </span>
      )}

      {/* UA indicator */}
      <span title={`UA: ${uaKey}`} style={{ fontSize: 14, flexShrink: 0 }}>
        {UA_ICONS[uaKey] ?? '🌐'}
      </span>

      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <button
        className="btn-ghost"
        onClick={onToggleMode}
        style={{ fontSize: 11, padding: '4px 8px', flexShrink: 0 }}
        title="Toggle theme"
      >
        {mode === 'cyber' ? '☀' : '⚡'}
      </button>

      {/* Sidebar / Downloads button */}
      <button
        className="btn-ghost"
        onClick={onToggleSidebar}
        style={{
          fontSize: 11, padding: '4px 10px', flexShrink: 0,
          position: 'relative',
          borderColor: sidebarOpen ? 'var(--accent)' : undefined,
          color: sidebarOpen ? 'var(--accent)' : undefined,
        }}
        title="Downloads & Settings"
      >
        ☰
        {jobCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent)', display: 'block',
          }} />
        )}
      </button>
    </div>
  );
}
