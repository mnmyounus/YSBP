import type { HeaderProfile } from '@/types';

export const UA_PROFILES: Record<string, HeaderProfile> = {
  'Chrome/Windows': {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Sec-GPC': '1',
  },
  'Firefox/Linux': {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Sec-GPC': '1',
  },
  'Safari/macOS': {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Sec-GPC': '1',
  },
  'Googlebot': {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'DNT': '1',
    'Sec-GPC': '1',
  },
  'Mobile/Android': {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Sec-GPC': '1',
  },
};

export const DEFAULT_PROFILE_KEY = 'Firefox/Linux';

export function getRandomProfile(): { key: string; profile: HeaderProfile } {
  const keys = Object.keys(UA_PROFILES);
  const key = keys[Math.floor(Math.random() * keys.length)];
  return { key, profile: UA_PROFILES[key] };
}

export function buildSpoofedHeaders(profileKey: string, extra?: Record<string, string>): Record<string, string> {
  const profile = UA_PROFILES[profileKey] ?? UA_PROFILES[DEFAULT_PROFILE_KEY];
  return {
    ...profile,
    ...(extra ?? {}),
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };
}
