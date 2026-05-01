/**
 * YSPB Media Sniffer API
 * Fetches a page via proxy and extracts all detectable media assets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProxyUrl, getFavicon } from '@/lib/url-utils';
import { buildSpoofedHeaders } from '@/lib/ua-profiles';
import { sniffMediaFromHtml, sniffDownloadLinks } from '@/lib/media-sniff';
import type { SniffResult } from '@/types';

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
  const headers = buildSpoofedHeaders(profileKey);

  try {
    const res = await fetch(body.url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json({
        ok: false, assets: [], pageTitle: '',
        error: `Upstream returned ${res.status}`,
      } as SniffResult);
    }

    const html = await res.text();

    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : new URL(body.url).hostname;

    // Sniff media assets
    const mediaAssets = sniffMediaFromHtml(html, body.url, {
      includeDocuments: true,
      includeImages: body.includeImages ?? false,
    });
    const downloadLinks = sniffDownloadLinks(html, body.url);

    // Deduplicate
    const allAssets = [...mediaAssets];
    const seen = new Set(mediaAssets.map((a) => a.url));
    for (const link of downloadLinks) {
      if (!seen.has(link.url)) {
        allAssets.push(link);
        seen.add(link.url);
      }
    }

    // Try to HEAD each asset for real size (limit to 5)
    const sizeCheckPromises = allAssets.slice(0, 5).map(async (asset) => {
      try {
        const head = await fetch(asset.url, {
          method: 'HEAD',
          headers,
          signal: AbortSignal.timeout(5_000),
        });
        const cl = head.headers.get('content-length');
        if (cl) asset.size = parseInt(cl, 10);
        const ct = head.headers.get('content-type');
        if (ct && ct !== 'application/octet-stream') asset.mimeType = ct.split(';')[0];
      } catch {
        // ignore
      }
    });
    await Promise.allSettled(sizeCheckPromises);

    return NextResponse.json({
      ok: true,
      assets: allAssets,
      pageTitle,
      favicon: getFavicon(body.url),
    } as SniffResult);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sniff failed';
    return NextResponse.json({ ok: false, assets: [], pageTitle: '', error: msg } as SniffResult, { status: 500 });
  }
}
