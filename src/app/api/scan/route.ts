/**
 * YSPB Malware Shield — Scan API
 * quickScan=true: only checks URL/filename/headers (fast, no download)
 * quickScan=false: fetches buffer and runs full heuristics
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProxyUrl, sanitizeFilename } from '@/lib/url-utils';
import { buildSpoofedHeaders } from '@/lib/ua-profiles';
import { scanBuffer } from '@/lib/scan-engine';
import type { ScanResult } from '@/types';

const DANGEROUS_EXTS = /\.(exe|dll|bat|cmd|vbs|ps1|sh|jar|msi|scr|pif|cpl|com|hta|apk|deb|rpm)$/i;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const validation = validateProxyUrl(body.url);
  if (!validation.ok) return NextResponse.json({ error: validation.reason }, { status: 403 });

  const filename = sanitizeFilename(body.filename ?? body.url.split('/').pop()?.split('?')[0] ?? 'file');
  const quickScan: boolean = body.quickScan ?? false;

  // ── Quick scan: header + filename only (no download, instant) ──
  if (quickScan) {
    const detections: string[] = [];
    let score = 0;

    if (DANGEROUS_EXTS.test(filename)) {
      detections.push(`⚠ Executable file type: .${filename.split('.').pop()}`);
      score = 55;
    }

    try {
      const head = await fetch(body.url, {
        method: 'HEAD',
        headers: buildSpoofedHeaders('Firefox/Linux'),
        signal: AbortSignal.timeout(6_000),
      });

      const ct = head.headers.get('content-type') ?? '';
      if (/application\/(x-msdownload|x-executable|x-msdos-program|java-archive)/.test(ct)) {
        detections.push(`⚠ Executable MIME type: ${ct}`);
        score = Math.max(score, 65);
      }

      const cd = head.headers.get('content-disposition') ?? '';
      const cdFilename = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)?.[1]?.replace(/['"]/g, '') ?? '';
      if (cdFilename && DANGEROUS_EXTS.test(cdFilename)) {
        detections.push(`⚠ Executable in Content-Disposition: ${cdFilename}`);
        score = Math.max(score, 60);
      }
    } catch { /* HEAD failed — not blocking */ }

    const verdict: ScanResult['verdict'] =
      score >= 65 ? 'suspicious' : score > 0 ? 'clean' : 'clean';

    return NextResponse.json({
      safe: verdict !== 'malicious',
      score,
      detections,
      scanEngine: 'YSPB Quick Scan',
      verdict,
      details: detections.length === 0
        ? 'Quick scan passed. File appears safe.'
        : `${detections.length} indicator(s) found. Proceeding with download.`,
    } as ScanResult);
  }

  // ── Full scan: download buffer + heuristics (used for small files) ──
  try {
    const headRes = await fetch(body.url, {
      method: 'HEAD',
      headers: buildSpoofedHeaders('Firefox/Linux'),
      signal: AbortSignal.timeout(8_000),
    });

    const contentLength = parseInt(headRes.headers.get('content-length') ?? '0', 10);
    const MAX = 30 * 1024 * 1024; // 30MB

    if (contentLength > MAX) {
      return NextResponse.json({
        safe: true, score: 0, detections: ['ℹ File too large for deep scan (>30MB)'],
        scanEngine: 'YSPB Size Guard', verdict: 'unknown',
        details: 'File exceeds deep scan limit. Quick scan only.',
      } as ScanResult);
    }

    const res = await fetch(body.url, {
      headers: buildSpoofedHeaders('Firefox/Linux'),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = await res.arrayBuffer();
    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    const result = await scanBuffer(buffer, filename, apiKey);
    return NextResponse.json(result);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Scan failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
