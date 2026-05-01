/**
 * YSPB Media Sniffer Engine
 * Detects media streams, direct files, and embeds from page source
 */

import type { MediaAsset } from '@/types';
import { sanitizeFilename, formatBytes } from './url-utils';

// Patterns for media detection
const MEDIA_PATTERNS = [
  // Direct video/audio files
  /https?:\/\/[^\s"'<>]+\.(?:mp4|mkv|webm|avi|mov|flv|m4v|3gp|ogv|ts|m3u8|mpd)(?:[?#][^\s"'<>]*)?/gi,
  // Direct audio files
  /https?:\/\/[^\s"'<>]+\.(?:mp3|ogg|aac|flac|wav|opus|m4a)(?:[?#][^\s"'<>]*)?/gi,
  // CDN-style media URLs
  /https?:\/\/[^\s"'<>]*(?:video|media|stream|hls|dash|cdn)[^\s"'<>]*\.(?:mp4|m3u8|mpd|ts)(?:[?#][^\s"'<>]*)?/gi,
];

const IMAGE_PATTERNS = [
  /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp|svg|avif|bmp)(?:[?#][^\s"'<>]*)?/gi,
];

const DOCUMENT_PATTERNS = [
  /https?:\/\/[^\s"'<>]+\.(?:pdf|docx?|xlsx?|pptx?|zip|tar\.gz|rar|7z)(?:[?#][^\s"'<>]*)?/gi,
];

// Common video embed markers
const EMBED_MARKERS = [
  'jwplayer',
  'videojs',
  'flowplayer',
  'brightcove',
  'kaltura',
  'wistia',
  'vimeo',
  'dailymotion',
  'file:',
  'sources:',
  '"src"',
  'streamUrl',
  'videoUrl',
  'hls_url',
  'dash_url',
  'manifest_url',
];

export interface SniffOptions {
  includeImages?: boolean;
  includeDocuments?: boolean;
  maxAssets?: number;
}

export function sniffMediaFromHtml(html: string, baseUrl: string, options: SniffOptions = {}): MediaAsset[] {
  const {
    includeImages = false,
    includeDocuments = true,
    maxAssets = 50,
  } = options;

  const found = new Map<string, MediaAsset>();

  const addAsset = (url: string, mimeHint?: string) => {
    if (found.size >= maxAssets) return;
    if (found.has(url)) return;

    try {
      const resolved = new URL(url, baseUrl).href;
      const ext = resolved.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
      const mime = mimeHint ?? extToMime(ext);
      const filename = sanitizeFilename(
        decodeURIComponent(resolved.split('/').pop()?.split('?')[0] ?? 'download')
      );

      found.set(resolved, {
        url: resolved,
        filename: filename || `download.${ext}`,
        size: null,
        mimeType: mime,
        format: ext.toUpperCase(),
        source: new URL(baseUrl).hostname,
        quality: guessQuality(resolved),
      });
    } catch {
      // skip invalid URLs
    }
  };

  // Scan media patterns
  for (const pattern of MEDIA_PATTERNS) {
    const matches = html.matchAll(pattern);
    for (const m of matches) addAsset(m[0]);
  }

  if (includeDocuments) {
    for (const pattern of DOCUMENT_PATTERNS) {
      const matches = html.matchAll(pattern);
      for (const m of matches) addAsset(m[0]);
    }
  }

  if (includeImages) {
    for (const pattern of IMAGE_PATTERNS) {
      const matches = html.matchAll(pattern);
      for (const m of matches) addAsset(m[0]);
    }
  }

  // Look for embedded player JSON blobs
  const jsonBlobPattern = /(?:sources|files|playlist)\s*[:=]\s*\[([^\]]{10,2000})\]/gi;
  const jsonMatches = html.matchAll(jsonBlobPattern);
  for (const m of jsonMatches) {
    const urlPattern = /["']?(https?:\/\/[^\s"',\]]{10,500})["']?/g;
    const urls = m[1].matchAll(urlPattern);
    for (const u of urls) addAsset(u[1]);
  }

  // Look for HLS/DASH manifests in script tags
  const manifestPattern = /["'](https?:\/\/[^"']+\.(?:m3u8|mpd)[^"']*)["']/gi;
  const manifests = html.matchAll(manifestPattern);
  for (const m of manifests) addAsset(m[1], m[1].includes('.m3u8') ? 'application/x-mpegURL' : 'application/dash+xml');

  return Array.from(found.values());
}

export function sniffDownloadLinks(html: string, baseUrl: string): MediaAsset[] {
  const found = new Map<string, MediaAsset>();

  // href download attributes
  const hrefPattern = /<a[^>]+href=["']([^"']+)["'][^>]*download(?:=["']([^"']*)["'])?[^>]*>/gi;
  const matches = html.matchAll(hrefPattern);
  for (const m of matches) {
    try {
      const url = new URL(m[1], baseUrl).href;
      const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
      const filename = m[2] ? sanitizeFilename(m[2]) : sanitizeFilename(url.split('/').pop()?.split('?')[0] ?? 'file');
      found.set(url, {
        url,
        filename,
        size: null,
        mimeType: extToMime(ext),
        format: ext.toUpperCase(),
        source: new URL(baseUrl).hostname,
      });
    } catch {
      // skip
    }
  }

  return Array.from(found.values());
}

function extToMime(ext: string): string {
  const map: Record<string, string> = {
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    m3u8: 'application/x-mpegURL',
    mpd: 'application/dash+xml',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
    flac: 'audio/flac',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    pdf: 'application/pdf',
    zip: 'application/zip',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  return map[ext] ?? 'application/octet-stream';
}

function guessQuality(url: string): string | undefined {
  const patterns: [RegExp, string][] = [
    [/(?:2160|4k|uhd)/i, '4K UHD'],
    [/(?:1080p?|fhd|fullhd)/i, '1080p FHD'],
    [/(?:720p?|hd)/i, '720p HD'],
    [/(?:480p?|sd)/i, '480p SD'],
    [/(?:360p?)/i, '360p'],
  ];
  for (const [re, label] of patterns) {
    if (re.test(url)) return label;
  }
  return undefined;
}
