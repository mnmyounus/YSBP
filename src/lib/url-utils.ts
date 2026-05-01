/**
 * URL Utilities for YSPB
 * Sanitize, validate, and normalize URLs before proxying
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.0.0',
  '10.0.0.0',
  '192.168.0.0',
  '172.16.0.0',
]);

const DANGEROUS_SCHEMES = new Set(['javascript', 'data', 'vbscript', 'file', 'blob']);

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // If it looks like a bare domain or search query
  if (!trimmed.includes('://')) {
    // Check if it looks like a domain
    if (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+/.test(trimmed)) {
      return `https://${trimmed}`;
    }
    // Treat as DuckDuckGo search
    return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

export function validateProxyUrl(urlString: string): { ok: boolean; reason?: string } {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { ok: false, reason: 'Invalid URL format' };
  }

  if (DANGEROUS_SCHEMES.has(url.protocol.replace(':', ''))) {
    return { ok: false, reason: `Blocked scheme: ${url.protocol}` };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { ok: false, reason: 'Only HTTP/HTTPS allowed' };
  }

  const hostname = url.hostname.toLowerCase();
  for (const blocked of BLOCKED_HOSTS) {
    if (hostname === blocked || hostname.startsWith(blocked + '.')) {
      return { ok: false, reason: 'Private/loopback addresses are blocked' };
    }
  }

  // Block SSRF vectors: numeric IPs in private ranges
  const ipv4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return { ok: false, reason: 'Private IP range blocked (SSRF protection)' };
    }
  }

  return { ok: true };
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function getFavicon(url: string): string {
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?sz=32&domain=${origin}`;
  } catch {
    return '';
  }
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._\-\s]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 200);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
