'use client';
import { useState, useCallback } from 'react';
import type { DownloadJob, MediaAsset, ScanResult } from '@/types';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function useDownloadManager() {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);

  const updateJob = useCallback((id: string, patch: Partial<DownloadJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const addJob = useCallback(
    async (asset: MediaAsset) => {
      const id = generateId();
      const job: DownloadJob = {
        id,
        asset,
        status: 'scanning',
        progress: 0,
        startedAt: Date.now(),
      };
      setJobs((prev) => [job, ...prev]);

      // Phase 1: Scan
      try {
        const scanRes = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: asset.url, filename: asset.filename }),
        });
        const scanResult: ScanResult = await scanRes.json();
        updateJob(id, { scanResult });

        if (scanResult.verdict === 'malicious') {
          updateJob(id, { status: 'blocked' });
          return;
        }
      } catch {
        updateJob(id, {
          scanResult: { safe: true, score: 0, detections: [], scanEngine: 'Offline', verdict: 'unknown' },
        });
      }

      // Phase 2: Download
      updateJob(id, { status: 'downloading', progress: 0 });
      try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(asset.url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        const contentLength = parseInt(res.headers.get('content-length') ?? '0', 10);
        const chunks: ArrayBuffer[] = [];
        let loaded = 0;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value.buffer as ArrayBuffer);
            loaded += value.byteLength;
            const progress = contentLength > 0 ? Math.round((loaded / contentLength) * 100) : -1;
            updateJob(id, { progress });
          }
        }

        const blob = new Blob(chunks, { type: asset.mimeType });
        updateJob(id, { status: 'completed', progress: 100, blob });

        // Trigger browser download
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = asset.filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      } catch (err: unknown) {
        updateJob(id, { status: 'error', error: err instanceof Error ? err.message : 'Download failed' });
      }
    },
    [updateJob]
  );

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status !== 'completed' && j.status !== 'blocked'));
  }, []);

  return { jobs, addJob, removeJob, clearCompleted };
}
