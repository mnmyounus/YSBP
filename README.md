# YSPB — Your Security & Privacy Browser

> **A production-ready, open-source Security Sandbox Browser.**  
> Built to run inside Brave, Tor, or DuckDuckGo Browser. Zero local setup required.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_USERNAME%2Fyspb&env=VIRUSTOTAL_API_KEY&envDescription=Optional%20VirusTotal%20API%20key%20for%20cloud%20AV%20scanning&project-name=yspb&repository-name=yspb)

**Lead Developer:** MNM YOUNUS  
**License:** AGPL-3.0  
**Stack:** Next.js 14 · TypeScript · Tailwind CSS

---

## ✦ Features

### Module A — Privacy & Anonymity (Tails-Style)
| Feature | Details |
|---|---|
| 🕶 Incognito by Default | No history, no cookies, session-only state |
| 🔒 Anti-Fingerprinting | User-Agent, Accept-Language, and request headers spoofed per profile |
| 🛡 Header Sanitization | Removes `Cookie`, `Authorization`, `X-Forwarded-For` before proxying |
| 🌐 Server Proxy | All requests route through `/api/proxy` — hides your browser from target sites |
| 5 UA Profiles | Chrome/Win · Firefox/Linux · Safari/Mac · Googlebot · Mobile/Android |

### Module B — 1DM-Inspired Download Manager
| Feature | Details |
|---|---|
| 📡 Media Sniffer | Detects MP4, MKV, WebM, M3U8, MPD, MP3, AAC, PDF, ZIP and more |
| 🎬 Stream Detection | Scans JWPlayer, VideoJS, HLS/DASH manifests, `sources:[]` JSON blobs |
| 📋 Metadata Manifest | Shows Filename · Size · MIME-type · Quality · Source before you download |
| ↓ Streamed Download | File downloads in chunks via proxy with live progress bar |
| 🔗 Download Links | Detects `<a download>` links automatically |

### Module C — Proactive Malware Shield
| Feature | Details |
|---|---|
| 🔬 Magic Byte Analysis | Detects PE, ELF, JAR, OLE2, RAR, ZIP, 7z executables by hex signature |
| 🚨 Heuristic Scanning | PowerShell encoded cmds, WScript, PHP eval, registry persistence keys |
| ☁ VirusTotal Integration | Optional cloud scanning via VT API (set `VIRUSTOTAL_API_KEY`) |
| ✗ Auto-Nuke | Malicious files are blocked before the browser-save event fires |
| 📏 Size Guard | Files >50MB receive a size-cap warning |

---

## 🚀 One-Click Deploy to Vercel

1. Click the **Deploy with Vercel** button above
2. Connect your GitHub account
3. Optionally set `VIRUSTOTAL_API_KEY` for cloud AV scanning
4. Click **Deploy** — done in ~60 seconds

---

## 💻 Local Development

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/yspb.git
cd yspb

# 2. Install
npm install

# 3. Configure (optional)
cp .env.example .env.local
# Edit .env.local to add VIRUSTOTAL_API_KEY if desired

# 4. Run
npm run dev
# Open http://localhost:3000
```

**Requirements:** Node.js 18+ · npm 9+. No other local dependencies.

---

## 🌐 GitHub Codespaces

1. Open repo → **Code** → **Codespaces** → **New codespace**
2. Wait for container to start
3. Run `npm install && npm run dev`
4. Click the forwarded port link

---

## 🏗 Architecture

```
yspb/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── proxy/route.ts      ← URL proxy middleware (CORS bypass + header strip)
│   │   │   ├── sniff/route.ts      ← Media asset detection engine
│   │   │   ├── scan/route.ts       ← Malware scan endpoint
│   │   │   └── headers/route.ts    ← UA profile listing
│   │   ├── globals.css             ← Cyber + Normal dual themes
│   │   ├── layout.tsx
│   │   └── page.tsx                ← Main application shell
│   ├── components/
│   │   ├── browser/
│   │   │   ├── Toolbar.tsx         ← Top bar, theme toggle, session ID
│   │   │   ├── AddressBar.tsx      ← URL input, Go, Stop, Sniff buttons
│   │   │   ├── BrowserFrame.tsx    ← Sandboxed <iframe> with CSP
│   │   │   └── Sidebar.tsx         ← Downloads / Privacy / Shield panels
│   │   ├── download/
│   │   │   ├── MediaSnifferPanel.tsx  ← Asset list with metadata manifest
│   │   │   └── DownloadManager.tsx    ← Job queue with progress + scan results
│   │   └── ui/
│   │       └── StatusBadge.tsx     ← Clean/Suspicious/Malicious/Unknown badges
│   ├── hooks/
│   │   ├── useTheme.ts             ← Cyber ↔ Normal theme switcher
│   │   └── useDownloadManager.ts  ← Download job state machine
│   ├── lib/
│   │   ├── ua-profiles.ts          ← 5 spoofable UA+header profiles
│   │   ├── url-utils.ts            ← URL normalization, SSRF protection
│   │   ├── media-sniff.ts          ← Regex + JSON blob media detection
│   │   └── scan-engine.ts          ← Magic bytes + heuristics + VT integration
│   └── types/index.ts              ← Shared TypeScript types
├── public/
│   └── favicon.svg
├── .env.example
├── vercel.json
├── LICENSE.md
└── README.md
```

---

## 🔐 Security Design

- **SSRF Protection**: Private/loopback IP ranges are blocked at the proxy layer
- **Scheme Whitelist**: Only `http:` and `https:` are proxied
- **Sandbox Iframe**: `sandbox="allow-scripts allow-forms allow-same-origin"` — no top navigation, no modals
- **No Cookies**: The proxy never forwards `Cookie` or `Authorization` headers upstream
- **Referrer Stripping**: All requests use `Referrer-Policy: no-referrer`
- **Auto-Abort**: Streams identified as malicious are aborted before `blob:` URL creation

---

## ⚙ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VIRUSTOTAL_API_KEY` | No | Enables VirusTotal cloud scanning |
| `NEXT_PUBLIC_VT_ENABLED` | No | Set to `1` to show VT badge in UI |

---

## 📄 License

YSPB is licensed under the **GNU Affero General Public License v3.0**.  
See [LICENSE.md](LICENSE.md) for full terms.

© 2024 MNM YOUNUS. All rights reserved under AGPL-3.0.
