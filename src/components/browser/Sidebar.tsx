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
  uaKey: string;
  proxyEnabled: boolean;
  onToggleProxy: () => void;
  onClose: () => void;
}

const UA_ICONS: Record<string, string> = {
  'Chrome/Windows': '🪟 Chrome/Win',
  'Firefox/Linux': '🐧 Firefox/Linux',
  'Safari/macOS': '🍎 Safari/Mac',
  'Googlebot': '🤖 Googlebot',
  'Mobile/Android': '📱 Chrome/Android',
};

export function Sidebar({ jobs, onRemove, onClearCompleted, incognito, onToggleIncognito, spoofedUA, uaKey, proxyEnabled, onToggleProxy, onClose }: Props) {
  const [panel, setPanel] = useState<Panel>('downloads');

  const tabs: { id: Panel; label: string; icon: string; badge?: number }[] = [
    { id: 'downloads', label: 'Downloads', icon: '↓', badge: jobs.filter(j => j.status === 'downloading' || j.status === 'scanning').length || undefined },
    { id: 'privacy', label: 'Privacy', icon: '🛡' },
    { id: 'shield', label: 'Shield', icon: '🔬' },
  ];

  return (
    <div className="panel" style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 0,
      borderTop: 'none',
      borderBottom: 'none',
      borderRight: 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)' }}>
          YSPB PANEL
        </span>
        <button className="btn-ghost" onClick={onClose} style={{ padding: '3px 8px', fontSize: 12 }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setPanel(t.id)}
            style={{
              flex: 1,
              padding: '9px 4px',
              background: panel === t.id ? 'var(--accent-dim)' : 'transparent',
              border: 'none',
              borderBottom: panel === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: panel === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
            {t.badge ? (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                background: 'var(--accent)', color: '#000',
                borderRadius: '50%', width: 14, height: 14,
                fontSize: 9, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {panel === 'downloads' && (
          <DownloadManager jobs={jobs} onRemove={onRemove} onClearCompleted={onClearCompleted} />
        )}
        {panel === 'privacy' && (
          <PrivacyPanel
            incognito={incognito}
            onToggleIncognito={onToggleIncognito}
            spoofedUA={spoofedUA}
            uaKey={uaKey}
            proxyEnabled={proxyEnabled}
            onToggleProxy={onToggleProxy}
          />
        )}
        {panel === 'shield' && <ShieldPanel />}
      </div>
    </div>
  );
}

function ToggleSwitch({ on, onToggle, label, sublabel, color }: {
  on: boolean; onToggle: () => void; label: string; sublabel?: string; color?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
      onClick={onToggle}>
      <div>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{sublabel}</div>}
      </div>
      <div style={{ width: 36, height: 20, borderRadius: 10, background: on ? (color ?? 'var(--accent)') : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: on ? '#000' : 'var(--text-dim)', transition: 'left 0.2s' }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '7px 12px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function PrivacyPanel({ incognito, onToggleIncognito, spoofedUA, uaKey, proxyEnabled, onToggleProxy }: {
  incognito: boolean; onToggleIncognito: () => void;
  spoofedUA: string; uaKey: string;
  proxyEnabled: boolean; onToggleProxy: () => void;
}) {
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <ToggleSwitch on={incognito} onToggle={onToggleIncognito} label="Incognito Mode" sublabel="No history · no cookies stored" color="var(--green)" />
      <ToggleSwitch on={proxyEnabled} onToggle={onToggleProxy} label="Server Proxy" sublabel="Routes via YSPB proxy layer" />
      <InfoRow label="ACTIVE UA PROFILE" value={`${uaKey}`} />
      <InfoRow label="ROTATES ON" value="Every navigation automatically" />
      <InfoRow label="REFERRER POLICY" value="no-referrer" />
      <InfoRow label="STRIPPED HEADERS" value="Cookie · Authorization · X-Forwarded-For" />
      <div style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          UA rotates randomly on every page load. For maximum anonymity use inside Tor Browser.
        </div>
      </div>
    </div>
  );
}

function ShieldPanel() {
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <InfoRow label="SCAN ENGINE" value="YSPB Heuristics v1.0" />
      <InfoRow label="VIRUSTOTAL" value="Set VIRUSTOTAL_API_KEY env var to enable" />
      <InfoRow label="MAGIC BYTES" value="PE · ELF · JAR · OLE2 · RAR · ZIP" />
      <InfoRow label="HEURISTICS" value="PowerShell · WScript · PHP eval · Registry keys" />
      <InfoRow label="ON THREAT DETECT" value="Stream aborted before save — file blocked" />
      <InfoRow label="MAX SCAN SIZE" value="50 MB" />
      <div style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          Files flagged as malicious are blocked to protect your device. This cannot be bypassed — it is the core protection of Module C.
        </div>
      </div>
    </div>
  );
}
