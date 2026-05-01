/**
 * YSPB Malware Shield — Scan API
 * Accepts a URL, fetches the file buffer, and runs the scan engine.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProxyUrl, sanitizeFilename } from '@/lib/url-utils';
import { buildSpoofedHeaders } from '@/lib/ua-profiles';
import { scanBuffer } from '@/lib/scan-engine';

const MAX_SCAN_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const validation = validateProxyUrl(body.url);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 403 });
  }

  const headers = buildSpoofedHeaders('Firefox/Linux');

  try {
    // First, HEAD request to check size
    const headRes = await fetch(body.url, {
      method: 'HEAD',
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    const contentLength = headRes.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_SCAN_SIZE) {
      return NextResponse.json({
        safe: false,
        score: 0,
        detections: ['ℹ File too large for in-memory scan (>50MB). Proceed with caution.'],
        scanEngine: 'YSPB Size Guard',
        verdict: 'unknown',
        details: 'File exceeds scan size limit. Manual verification recommended.',
      });
    }

    const res = await fetch(body.url, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    const filename = sanitizeFilename(
      body.filename ?? body.url.split('/').pop()?.split('?')[0] ?? 'unknown'
    );

    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    const result = await scanBuffer(buffer, filename, apiKey);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Scan failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
