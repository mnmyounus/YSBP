/**
 * YSPB Malware Shield — Scan Engine
 * Performs heuristic + hash-based analysis on file buffers.
 * Integrates with VirusTotal API when VIRUSTOTAL_API_KEY is set.
 */

import type { ScanResult } from '@/types';

// Magic bytes for dangerous file types
const MAGIC_BYTES: Array<{ hex: string; label: string; risk: 'low' | 'high' }> = [
  { hex: '4d5a', label: 'Windows PE Executable (.exe/.dll)', risk: 'high' },
  { hex: '7f454c46', label: 'Linux ELF Executable', risk: 'high' },
  { hex: 'cafebabe', label: 'Java Class/JAR Bytecode', risk: 'high' },
  { hex: '504b0304', label: 'ZIP Archive (may contain executables)', risk: 'low' },
  { hex: 'd0cf11e0', label: 'Microsoft Office OLE2 (legacy, macro risk)', risk: 'high' },
  { hex: '52617221', label: 'RAR Archive', risk: 'low' },
  { hex: '377abcaf', label: '7-Zip Archive', risk: 'low' },
  { hex: '1f8b08', label: 'GZIP Archive', risk: 'low' },
  { hex: '25504446', label: 'PDF Document', risk: 'low' },
];

// Heuristic patterns in file content (strings)
const HEURISTIC_PATTERNS = [
  { pattern: /powershell\s+-(?:enc|encodedcommand|exec|nop|w\s+hidden)/i, label: 'PowerShell encoded/hidden command', score: 80 },
  { pattern: /cmd\.exe\s+\/c\s+/i, label: 'CMD.exe execution chain', score: 60 },
  { pattern: /WScript\.Shell/i, label: 'WScript Shell object (common in malware droppers)', score: 70 },
  { pattern: /HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run/i, label: 'Registry persistence key', score: 75 },
  { pattern: /eval\(base64_decode\(/i, label: 'PHP eval(base64_decode()) — code injection', score: 85 },
  { pattern: /document\.write\(unescape\(/i, label: 'JS unescape injection', score: 65 },
  { pattern: /\bnet\s+user\s+\/add\b/i, label: 'Net user add (account creation)', score: 90 },
  { pattern: /mimikatz/i, label: 'Mimikatz credential dumper reference', score: 95 },
];

export async function scanBuffer(buffer: ArrayBuffer, filename: string, apiKey?: string): Promise<ScanResult> {
  const bytes = new Uint8Array(buffer);
  const detections: string[] = [];
  let maxScore = 0;

  // 1. Magic byte analysis
  const hexHead = Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  for (const magic of MAGIC_BYTES) {
    if (hexHead.startsWith(magic.hex)) {
      if (magic.risk === 'high') {
        detections.push(`⚠ ${magic.label}`);
        maxScore = Math.max(maxScore, 60);
      } else {
        detections.push(`ℹ ${magic.label}`);
        maxScore = Math.max(maxScore, 10);
      }
    }
  }

  // 2. Heuristic string scanning (text-based files only)
  if (buffer.byteLength < 5_000_000) {
    // Only scan files < 5MB for heuristics
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 100_000));
    for (const { pattern, label, score } of HEURISTIC_PATTERNS) {
      if (pattern.test(text)) {
        detections.push(`🚨 ${label}`);
        maxScore = Math.max(maxScore, score);
      }
    }
  }

  // 3. Suspicious filename check
  const dangerousExts = /\.(exe|dll|bat|cmd|vbs|ps1|sh|py|jar|msi|scr|pif|cpl|com|hta)$/i;
  if (dangerousExts.test(filename)) {
    detections.push(`⚠ Executable file extension: ${filename.split('.').pop()}`);
    maxScore = Math.max(maxScore, 50);
  }

  // 4. VirusTotal integration (if API key provided)
  let vtVerdict: ScanResult['verdict'] | undefined;
  if (apiKey && buffer.byteLength < 32 * 1024 * 1024) {
    try {
      const vtResult = await submitToVirusTotal(buffer, filename, apiKey);
      if (vtResult) {
        maxScore = Math.max(maxScore, vtResult.score);
        detections.push(...vtResult.detections);
        vtVerdict = vtResult.verdict;
      }
    } catch {
      detections.push('ℹ VirusTotal scan unavailable');
    }
  }

  const verdict: ScanResult['verdict'] =
    vtVerdict ??
    (maxScore >= 70 ? 'malicious' : maxScore >= 30 ? 'suspicious' : maxScore > 0 ? 'clean' : 'clean');

  return {
    safe: verdict === 'clean',
    score: maxScore,
    detections,
    scanEngine: apiKey ? 'YSPB Heuristics + VirusTotal' : 'YSPB Heuristics',
    verdict,
    details:
      detections.length === 0
        ? 'No threats detected. File appears clean.'
        : `Found ${detections.length} indicator(s). Review before proceeding.`,
  };
}

async function submitToVirusTotal(
  buffer: ArrayBuffer,
  filename: string,
  apiKey: string
): Promise<{ score: number; detections: string[]; verdict: ScanResult['verdict'] } | null> {
  const formData = new FormData();
  formData.append('file', new Blob([buffer]), filename);

  const uploadRes = await fetch('https://www.virustotal.com/api/v3/files', {
    method: 'POST',
    headers: { 'x-apikey': apiKey },
    body: formData,
  });

  if (!uploadRes.ok) return null;
  const uploadJson = await uploadRes.json();
  const analysisId: string = uploadJson?.data?.id;
  if (!analysisId) return null;

  // Poll for results (max 30s)
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers: { 'x-apikey': apiKey },
    });
    if (!pollRes.ok) continue;
    const pollJson = await pollRes.json();
    const stats = pollJson?.data?.attributes?.stats;
    if (stats && pollJson.data.attributes.status === 'completed') {
      const malicious: number = stats.malicious ?? 0;
      const suspicious: number = stats.suspicious ?? 0;
      const total = (stats.harmless ?? 0) + malicious + suspicious + (stats.undetected ?? 0);
      const score = total > 0 ? Math.round(((malicious * 100 + suspicious * 50) / total)) : 0;
      const detections: string[] = [];
      if (malicious > 0) detections.push(`🚨 VirusTotal: ${malicious}/${total} engines flagged as malicious`);
      if (suspicious > 0) detections.push(`⚠ VirusTotal: ${suspicious}/${total} engines flagged as suspicious`);
      return {
        score,
        detections,
        verdict: malicious > 0 ? 'malicious' : suspicious > 0 ? 'suspicious' : 'clean',
      };
    }
  }
  return null;
}
