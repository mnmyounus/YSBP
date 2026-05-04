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
    setJobs(prev => [{ id, asset, status: 'scanning', progress: 0, startedAt: Date.now() }, ...prev]);

    // Phase 1: Quick scan (header only, fast)
    try {
      const scanRes = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: asset.url, filename: asset.filename, quickScan: true }),
      });
      if (scanRes.ok) {
        const scanResult: ScanResult = await scanRes.json();
        updateJob(id, { scanResult });
        if (scanResult.verdict === 'malicious') {
          updateJob(id, { status: 'blocked' });
          return;
        }
      }
    } catch {
      updateJob(id, {
        scanResult: { safe: true, score: 0, detections: [], scanEngine: 'Offline', verdict: 'unknown', details: 'Scan unavailable' }
      });
    }

    // Phase 2: Download via server proxy (avoids CORS)
    updateJob(id, { status: 'downloading', progress: 0 });

    try {
      const proxyUrl = `/api/download?url=${encodeURIComponent(asset.url)}&filename=${encodeURIComponent(asset.filename)}`;
      const res = await fetch(proxyUrl);

      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(errText.includes('{') ? `HTTP ${res.status}` : errText);
      }

      const contentLength = parseInt(res.headers.get('content-length') ?? '0', 10);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const chunks: Uint8Array[] = [];
      let loaded = 0;
      let lastUIUpdate = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        const now = Date.now();
        if (now - lastUIUpdate > 80) {
          const pct = contentLength > 0 ? Math.min(Math.round((loaded / contentLength) * 100), 99) : -1;
          updateJob(id, { progress: pct });
          lastUIUpdate = now;
        }
      }

      // Build blob from Uint8Array chunks (avoids ArrayBuffer type issues)
      const totalBytes = chunks.reduce((s, c) => s + c.byteLength, 0);
      const merged = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }

      const mimeType = res.headers.get('content-type')?.split(';')[0].trim()
        || asset.mimeType
        || 'application/octet-stream';

      const blob = new Blob([merged], { type: mimeType });
      updateJob(id, { status: 'completed', progress: 100 });

      // Trigger save dialog
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = asset.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

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
