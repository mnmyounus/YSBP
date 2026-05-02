/**
 * YSPB Media Sniffer API
 * Fetches a page and extracts all detectable media assets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProxyUrl, getFavicon } from '@/lib/url-utils';
import { buildSpoofedHeaders } from '@/lib/ua-profiles';
import { sniffMediaFromHtml, sniffDownloadLinks } from '@/lib/media-sniff';
import type { SniffResult } from '@/types';

function buildSiteHeaders(profileKey: string, targetUrl: string): Record<string, string> {
  const base = buildSpoofedHeaders(profileKey);
  const hostname = (() => { try { return new URL(targetUrl).hostname; } catch { return ''; } })();
  const origin   = (() => { try { return new URL(targetUrl).origin; } catch { return ''; } })();

  return {
    ...base,
    'Referer': origin,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    // YouTube / Google consent
    ...(hostname.includes('youtube.com') || hostname.includes('google.com') ? {
      'Cookie': 'CONSENT=YES+cb; SOCS=CAESEwgDEgk0OTM5NzI0MzUaAmVuIAEaBgiAo_CmBg',
    } : {}),
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.url) {
    return NextResponse.json({ ok: false, assets: [], pageTitle: '', error: 'Missing url' } as SniffResult, { status: 400 });
  }

  const validation = validateProxyUrl(body.url);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, assets: [], pageTitle: '', error: validation.reason } as SniffResult, { status: 403 });
  }

  const profileKey = body.ua ?? 'Chrome/Windows';
  const headers = buildSiteHeaders(profileKey, body.url);

  let html = '';
  let finalUrl = body.url;

  try {
    const res = await fetch(body.url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });

    finalUrl = res.url || body.url;

    if (!res.ok) {
      // Still try to sniff whatever came back
      html = await res.text().catch(() => '');
      if (!html) {
        return NextResponse.json({
          ok: false, assets: [], pageTitle: '',
          error: `Site returned HTTP ${res.status}. It may block server-side requests.`,
        } as SniffResult);
      }
    } else {
      html = await res.text();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json({
      ok: false, assets: [], pageTitle: '',
      error: `Could not reach site: ${msg}`,
    } as SniffResult, { status: 500 });
  }

  // Extract page title
  const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  const pageTitle = titleMatch
    ? titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    : new URL(body.url).hostname;

  // Sniff assets
  const mediaAssets = sniffMediaFromHtml(html, finalUrl, {
    includeDocuments: true,
    includeImages: body.includeImages ?? false,
  });
  const downloadLinks = sniffDownloadLinks(html, finalUrl);

  // Merge & deduplicate
  const allAssets = [...mediaAssets];
  const seen = new Set(mediaAssets.map(a => a.url));
  for (const link of downloadLinks) {
    if (!seen.has(link.url)) { allAssets.push(link); seen.add(link.url); }
  }

  // HEAD requests for size/mime (up to 8 assets, parallel)
  await Promise.allSettled(
    allAssets.slice(0, 8).map(async (asset) => {
      try {
        const head = await fetch(asset.url, {
          method: 'HEAD',
          headers: buildSpoofedHeaders(profileKey),
          signal: AbortSignal.timeout(6_000),
        });
        const cl = head.headers.get('content-length');
        if (cl) asset.size = parseInt(cl, 10);
        const ct = head.headers.get('content-type');
        if (ct && !ct.includes('octet-stream')) asset.mimeType = ct.split(';')[0].trim();
      } catch { /* skip */ }
    })
  );

  return NextResponse.json({
    ok: true,
    assets: allAssets,
    pageTitle,
    favicon: getFavicon(body.url),
  } as SniffResult);
}
