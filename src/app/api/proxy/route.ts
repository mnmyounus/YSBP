/**
 * YSPB URL Proxy Middleware
 * Proxies HTTP requests through the server to bypass CORS and strip tracking headers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProxyUrl } from '@/lib/url-utils';
import { buildSpoofedHeaders } from '@/lib/ua-profiles';

const STRIP_REQUEST_HEADERS = new Set([
  'cookie', 'authorization', 'x-forwarded-for', 'x-real-ip',
  'x-forwarded-host', 'x-forwarded-proto', 'via', 'origin',
]);

const STRIP_RESPONSE_HEADERS = new Set([
  'set-cookie', 'x-frame-options', 'content-security-policy',
  'x-content-security-policy', 'access-control-allow-origin',
  'strict-transport-security',
]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  const profileKey = searchParams.get('ua') ?? 'Firefox/Linux';

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const validation = validateProxyUrl(target);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 403 });
  }

  const spoofedHeaders = buildSpoofedHeaders(profileKey, {
    'Referer': new URL(target).origin,
    'Upgrade-Insecure-Requests': '1',
  });

  // Remove identifying headers
  for (const key of STRIP_REQUEST_HEADERS) {
    delete spoofedHeaders[key];
  }

  try {
    const upstream = await fetch(target, {
      method: 'GET',
      headers: spoofedHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });

    const contentType = upstream.headers.get('content-type') ?? 'text/plain';
    const body = await upstream.arrayBuffer();

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('X-YSPB-Proxied', '1');
    responseHeaders.set('X-YSPB-Origin', new URL(target).hostname);
    responseHeaders.set('Cache-Control', 'no-store');

    // Forward safe headers only
    for (const [key, value] of upstream.headers.entries()) {
      if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        if (['content-length', 'content-encoding', 'content-disposition'].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      }
    }

    return new NextResponse(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Proxy error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
