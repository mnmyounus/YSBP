'use client';
import type { ScanResult } from '@/types';

interface Props {
  verdict: ScanResult['verdict'];
  score?: number;
}

const LABELS: Record<ScanResult['verdict'], string> = {
  clean: 'CLEAN',
  suspicious: 'SUSPICIOUS',
  malicious: 'MALICIOUS',
  unknown: 'UNKNOWN',
};

const CLASSES: Record<ScanResult['verdict'], string> = {
  clean: 'badge badge-clean',
  suspicious: 'badge badge-warn',
  malicious: 'badge badge-danger',
  unknown: 'badge badge-unknown',
};

const ICONS: Record<ScanResult['verdict'], string> = {
  clean: '✓',
  suspicious: '⚠',
  malicious: '✗',
  unknown: '?',
};

export function StatusBadge({ verdict, score }: Props) {
  return (
    <span className={CLASSES[verdict]}>
      {ICONS[verdict]} {LABELS[verdict]}
      {score !== undefined && score > 0 && ` (${score}%)`}
    </span>
  );
}
