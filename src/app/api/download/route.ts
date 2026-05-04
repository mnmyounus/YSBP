/**
 * YSPB Download Route
 * Streams files through the server to bypass CORS.
 * Uses multiple fallback header strategies for stubborn sites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProxyUrl, sanitizeFilename } from '@/lib/url-utils';

const HEADER_STRATEGIES = [
  // Strategy 1: Generic browser
  {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
  },
  // Strategy 2: Download manager style
  {
    'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2)',
    'Accept': '*/*',
    'Accept-Encoding': 'identity',
    'Connection': 'keep-alive',
  },
  // Strategy 3: Minimal headers
  {
    'User-Agent': 'curl/8.4.0',
    'Accept': '*/*',
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  const filename = sanitizeFilename(searchParams.get('filename') ?? 'download');

  if (!target) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const validation = validateProxyUrl(target);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 403 });
  }

  let lastError = '';

  for (const headers of HEADER_STRATEGIES) {
    try {
      const upstream = await fetch(target, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(60_000),
      });

      if (!upstream.ok) {
        lastError = `Upstream returned ${upstream.status}`;
        // Don't retry on 403/404 — they won't change with different headers
        if (upstream.status === 404 || upstream.status === 410) break;
        if (upstream.status === 403) continue;
        continue;
      }

      if (!upstream.body) {
        lastError = 'No response body from upstream';
        continue;
      }

      const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
      const contentLength = upstream.headers.get('content-length');

      const responseHeaders = new Headers({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'X-YSPB-Source': new URL(target).hostname,
      });

      if (contentLength) responseHeaders.set('Content-Length', contentLength);

      // Stream the body directly — no buffering
      return new NextResponse(upstream.body, {
        status: 200,
        headers: responseHeaders,
      });

    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'Fetch error';
      continue;
    }
  }

  // All strategies failed — return helpful error
  return new NextResponse(
    JSON.stringify({ error: `Could not download file: ${lastError}` }),
    { status: 502, headers: { 'Content-Type': 'application/json' } }
  );
}
