'use client';
import { useState, useCallback } from 'react';
import type { DownloadJob, MediaAsset, ScanResult } from '@/types';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function useDownloadManager() {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);

  const updateJob = useCallback((id: string, patch: Partial<DownloadJob>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j));
  }, []);

  const addJob = useCallback(async (asset: MediaAsset) => {
    const id = generateId();
    setJobs(prev => [{
      id, asset, status: 'scanning', progress: 0, startedAt: Date.now()
    }, ...prev]);

    // ── Phase 1: Quick heuristic scan (no full download needed) ──
    try {
      const scanRes = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: asset.url, filename: asset.filename, quickScan: true }),
      });
      const scanResult: ScanResult = await scanRes.json();
      updateJob(id, { scanResult });

      if (scanResult.verdict === 'malicious') {
        updateJob(id, { status: 'blocked' });
        return;
      }
    } catch {
      // Scan unavailable — proceed with unknown verdict
      updateJob(id, {
        scanResult: { safe: true, score: 0, detections: [], scanEngine: 'Offline', verdict: 'unknown', details: 'Scan service unavailable' }
      });
    }

    // ── Phase 2: Streamed download with real-time progress ──
    updateJob(id, { status: 'downloading', progress: 0 });

    try {
      // Try direct download first (faster), fallback to proxy
      const directRes = await fetch(asset.url, {
        headers: { 'Referer': asset.url, 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5_000),
      }).catch(() => null);

      const res = (directRes?.ok) ? directRes :
        await fetch(`/api/proxy?url=${encodeURIComponent(asset.url)}`);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentLength = parseInt(res.headers.get('content-length') ?? '0', 10);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const chunks: ArrayBuffer[] = [];
      let loaded = 0;
      let lastUpdate = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value.buffer as ArrayBuffer);
        loaded += value.byteLength;

        // Throttle UI updates to every 100ms for performance
        const now = Date.now();
        if (now - lastUpdate > 100) {
          const progress = contentLength > 0 ? Math.min(Math.round((loaded / contentLength) * 100), 99) : -1;
          updateJob(id, { progress });
          lastUpdate = now;
        }
      }

      const blob = new Blob(chunks, { type: asset.mimeType || 'application/octet-stream' });
      updateJob(id, { status: 'completed', progress: 100 });

      // Trigger browser save
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = asset.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);

    } catch (err: unknown) {
      updateJob(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Download failed'
      });
    }
  }, [updateJob]);

  const removeJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(j => !['completed', 'blocked', 'error'].includes(j.status)));
  }, []);

  return { jobs, addJob, removeJob, clearCompleted };
}
