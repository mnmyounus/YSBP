export type UIMode = 'cyber' | 'normal';

export interface ProxyRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
}

export interface ProxyResponse {
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
  finalUrl: string;
  size: number;
  headers: Record<string, string>;
}

export interface MediaAsset {
  url: string;
  filename: string;
  size: number | null;
  mimeType: string;
  quality?: string;
  format?: string;
  duration?: string;
  source: string;
  integrity?: string;
}

export interface SniffResult {
  ok: boolean;
  assets: MediaAsset[];
  pageTitle: string;
  favicon?: string;
  error?: string;
}

export interface ScanResult {
  safe: boolean;
  score: number; // 0-100 malicious score
  detections: string[];
  scanEngine: string;
  sha256?: string;
  verdict: 'clean' | 'suspicious' | 'malicious' | 'unknown';
  details?: string;
}

export interface DownloadJob {
  id: string;
  asset: MediaAsset;
  status: 'pending' | 'scanning' | 'downloading' | 'paused' | 'completed' | 'blocked' | 'error';
  progress: number;
  scanResult?: ScanResult;
  startedAt: number;
  error?: string;
  blob?: Blob;
}

export interface BrowserSession {
  id: string;
  incognito: boolean;
  spoofedUA: string;
  proxyEnabled: boolean;
  startedAt: number;
  visitedUrls: string[];
}

export interface HeaderProfile {
  'User-Agent': string;
  'Accept-Language': string;
  'Accept': string;
  'Accept-Encoding': string;
  'DNT': string;
  'Sec-GPC': string;
}
