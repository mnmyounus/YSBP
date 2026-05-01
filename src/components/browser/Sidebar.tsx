'use client';
import { useState } from 'react';
import type { DownloadJob } from '@/types';
import { DownloadManager } from '@/components/download/DownloadManager';

type Panel = 'downloads' | 'privacy' | 'shield';

interface Props {
  jobs: DownloadJob[];
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  incognito: boolean;
  onToggleIncognito: () => void;
  spoofedUA: string;
  proxyEnabled: boolean;
  onToggleProxy: () => void;
}

export function Sidebar({ jobs, onRemove, onClearCompleted, incognito, onToggleIncognito, spoofedUA, proxyEnabled, onToggleProxy }: Props) {
  const [panel, setPanel] = useState<Panel>('downloads');

  const tabs: { id: Panel; label: string; icon: string; badge?: number }[] = [
    { id: 'downloads', label: 'DL', icon: '↓', badge: jobs.filter(j => j.status === 'downloading' || j.status === 'scanning').length || undefined },
    { id: 'privacy', label: 'PVT', icon: '🛡' },
    { id: 'shield', label: 'AV', icon: '🔬' },
  ];

  return (
    <div
      className="panel"
      style={{
        width: 280,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
        borderTop: 'none',
        borderBottom: 'none',
        borderRight: 'none',
      }}
    >
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setPanel(t.id)}
            style={{
              flex: 1,
              padding: '9px 4px',
              background: panel === t.id ? 'var(--accent-dim)' : 'transparent',
              border: 'none',
              borderBottom: panel === t.id ? `2px solid var(--accent)` : '2px solid transparent',
              color: panel === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s',
            }}
          >
            {t.icon} {t.label}
            {t.badge ? (
              <span style={{
                position: 'absolute',
                top: 4, right: 4,
                background: 'var(--accent)',
                color: '#000',
                borderRadius: '50%',
                width: 14, height: 14,
                fontSize: 9,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {panel === 'downloads' && (
          <DownloadManager jobs={jobs} onRemove={onRemove} onClearCompleted={onClearCompleted} />
        )}
        {panel === 'privacy' && (
          <PrivacyPanel
            incognito={incognito}
            onToggleIncognito={onToggleIncognito}
            spoofedUA={spoofedUA}
            proxyEnabled={proxyEnabled}
            onToggleProxy={onToggleProxy}
          />
        )}
        {panel === 'shield' && <ShieldPanel />}
      </div>
    </div>
  );
}

function ToggleSwitch({ on, onToggle, label, sublabel, color }: { on: boolean; onToggle: () => void; label: string; sublabel?: string; color?: string }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
      onClick={onToggle}
    >
      <div>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{sublabel}</div>}
      </div>
      <div
        style={{
          width: 36, height: 20,
          borderRadius: 10,
          background: on ? (color ?? 'var(--accent)') : 'var(--border)',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 2,
          left: on ? 18 : 2,
          width: 16, height: 16,
          borderRadius: 8,
          background: on ? '#000' : 'var(--text-dim)',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: mono ? 'var(--font-mono)' : undefined, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function PrivacyPanel({ incognito, onToggleIncognito, spoofedUA, proxyEnabled, onToggleProxy }: {
  incognito: boolean; onToggleIncognito: () => void;
  spoofedUA: string; proxyEnabled: boolean; onToggleProxy: () => void;
}) {
  return (
    <div>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em' }}>
        🛡 PRIVACY CONTROLS
      </div>
      <ToggleSwitch on={incognito} onToggle={onToggleIncognito} label="Incognito Mode" sublabel="No history, no cookies stored" color="var(--green)" />
      <ToggleSwitch on={proxyEnabled} onToggle={onToggleProxy} label="Server Proxy" sublabel="Route requests through YSPB proxy" />
      <InfoRow label="SPOOFED USER-AGENT" value={spoofedUA} mono />
      <InfoRow label="REFERRER POLICY" value="no-referrer" />
      <InfoRow label="TRACKER HEADERS" value="Stripped by middleware" />
      <InfoRow label="FINGERPRINTING" value="UA + Accept headers spoofed" />
      <div style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          YSPB runs inside your host browser&apos;s sandbox. For maximum anonymity, use inside the Tor Browser.
        </div>
      </div>
    </div>
  );
}

function ShieldPanel() {
  return (
    <div>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em' }}>
        🔬 MALWARE SHIELD
      </div>
      <InfoRow label="SCAN ENGINE" value="YSPB Heuristics v1.0" />
      <InfoRow label="VIRUSTOTAL" value={process.env.NEXT_PUBLIC_VT_ENABLED === '1' ? '✓ Connected' : '○ Set VIRUSTOTAL_API_KEY to enable'} />
      <InfoRow label="MAGIC BYTES" value="PE, ELF, JAR, OLE2, RAR, ZIP" />
      <InfoRow label="HEURISTICS" value="PowerShell, WScript, PHP eval, registry persistence" />
      <InfoRow label="AUTO-NUKE" value="Malicious streams aborted automatically" />
      <InfoRow label="SIZE LIMIT" value="50 MB in-memory scan cap" />
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Add <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>VIRUSTOTAL_API_KEY</code> to your Vercel environment variables to enable cloud AV scanning.
        </div>
      </div>
    </div>
  );
}
