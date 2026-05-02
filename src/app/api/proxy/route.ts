/**
 * YSPB URL Proxy Middleware
 * Proxies HTTP requests through the server to bypass CORS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProxyUrl } from '@/lib/url-utils';
import { buildSpoofedHeaders } from '@/lib/ua-profiles';

const STRIP_REQUEST_HEADERS = [
  'cookie', 'authorization', 'x-forwarded-for', 'x-real-ip',
  'x-forwarded-host', 'x-forwarded-proto', 'via', 'origin',
];

const STRIP_RESPONSE_HEADERS = new Set([
  'set-cookie', 'x-frame-options', 'content-security-policy',
  'x-content-security-policy', 'x-webkit-csp',
  'access-control-allow-origin', 'strict-transport-security',
  'content-security-policy-report-only',
]);

// Headers that help bypass bot detection on sites like YouTube, Tamilgun
function buildEnhancedHeaders(profileKey: string, targetUrl: string): Record<string, string> {
  const base = buildSpoofedHeaders(profileKey);
  const origin = (() => { try { const u = new URL(targetUrl); return u.origin; } catch { return ''; } })();
  const hostname = (() => { try { return new URL(targetUrl).hostname; } catch { return ''; } })();

  return {
    ...base,
    'Referer': origin,
    'Origin': origin,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    // YouTube / Google consent bypass
    ...(hostname.includes('youtube.com') || hostname.includes('google.com') ? {
      'Cookie': 'CONSENT=YES+cb; SOCS=CAESEwgDEgk0OTM5NzI0MzUaAmVuIAEaBgiAo_CmBg',
    } : {}),
  };
}

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

  const headers = buildEnhancedHeaders(profileKey, target);

  // Remove identifying headers
  for (const key of STRIP_REQUEST_HEADERS) {
    delete headers[key];
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upstream fetch failed';
    // Return a readable error page instead of JSON so the iframe shows it
    return new NextResponse(errorPage(target, msg), {
      status: 502,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const contentType = upstream.headers.get('content-type') ?? 'text/plain';
  let body: ArrayBuffer | string;

  // For HTML pages: rewrite links to go through proxy
  if (contentType.includes('text/html')) {
    try {
      const text = await upstream.text();
      body = rewriteHtml(text, target);
    } catch {
      body = await upstream.arrayBuffer();
    }
  } else {
    body = await upstream.arrayBuffer();
  }

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', contentType);
  responseHeaders.set('X-YSPB-Proxied', '1');
  responseHeaders.set('X-YSPB-Origin', (() => { try { return new URL(target).hostname; } catch { return target; } })());
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('Access-Control-Allow-Origin', '*');

  // Forward safe headers only
  for (const [key] of upstream.headers.entries()) {
    const lk = key.toLowerCase();
    if (!STRIP_RESPONSE_HEADERS.has(lk)) {
      if (['content-length', 'content-encoding', 'content-disposition', 'last-modified', 'etag'].includes(lk)) {
        responseHeaders.set(key, upstream.headers.get(key) ?? '');
      }
    }
  }

  return new NextResponse(body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

/**
 * Rewrite HTML so all internal links/assets route through /api/proxy
 */
function rewriteHtml(html: string, baseUrl: string): string {
  const base = (() => { try { return new URL(baseUrl); } catch { return null; } })();
  if (!base) return html;

  const proxyPrefix = `/api/proxy?url=`;

  const resolveUrl = (raw: string): string => {
    if (!raw || raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('javascript:') || raw.startsWith('#')) return raw;
    if (raw.startsWith('/api/proxy')) return raw;
    try {
      const abs = new URL(raw, baseUrl).href;
      return `${proxyPrefix}${encodeURIComponent(abs)}`;
    } catch {
      return raw;
    }
  };

  // Inject <base> tag and rewrite src/href/action attributes
  let result = html;

  // Inject base tag after <head> so relative URLs resolve correctly
  result = result.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}">`);

  // Rewrite href on <a>, <link>
  result = result.replace(/(<(?:a|link|area)[^>]+\s)href=(["'])([^"']*)\2/gi, (_, pre, q, url) =>
    `${pre}href=${q}${resolveUrl(url)}${q}`
  );

  // Rewrite src on <img>, <script>, <iframe>, <video>, <audio>, <source>
  result = result.replace(/(<(?:img|script|iframe|video|audio|source|track|embed)[^>]+\s)src=(["'])([^"']*)\2/gi, (_, pre, q, url) =>
    `${pre}src=${q}${resolveUrl(url)}${q}`
  );

  // Rewrite action on <form>
  result = result.replace(/(<form[^>]+\s)action=(["'])([^"']*)\2/gi, (_, pre, q, url) =>
    `${pre}action=${q}${resolveUrl(url)}${q}`
  );

  // Rewrite srcset
  result = result.replace(/srcset=(["'])([^"']*)\1/gi, (_, q, srcset) => {
    const rewritten = srcset.replace(/(\S+)(\s+\d+[wx])?/g, (m: string, url: string, size: string) =>
      url ? `${resolveUrl(url)}${size ?? ''}` : m
    );
    return `srcset=${q}${rewritten}${q}`;
  });

  // Remove CSP meta tags that would block the proxy
  result = result.replace(/<meta[^>]+http-equiv=["']content-security-policy["'][^>]*>/gi, '');

  return result;
}

function errorPage(url: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>YSPB — Connection Error</title>
<style>
  body { background:#050508; color:#e8eaf6; font-family:monospace; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; flex-direction:column; gap:16px; padding:20px; text-align:center; }
  .code { color:#ff3366; font-size:32px; font-weight:900; }
  .msg { color:#7986cb; font-size:13px; max-width:480px; line-height:1.6; }
  .url { color:#3d4a6b; font-size:11px; word-break:break-all; max-width:480px; }
  .hint { color:#ffaa00; font-size:11px; }
</style>
</head>
<body>
  <div class="code">⚡ CONNECTION ERROR</div>
  <div class="msg">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  <div class="url">${url.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  <div class="hint">This site may block proxies. Try disabling proxy mode in Privacy settings.</div>
</body>
</html>`;
}
