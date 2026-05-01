import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YSPB — Your Security & Privacy Browser',
  description:
    'A production-ready, open-source security sandbox browser with anti-fingerprinting, media sniffing, and malware scanning. Built by MNM YOUNUS.',
  keywords: ['privacy browser', 'security sandbox', 'anti-fingerprinting', 'media downloader', 'malware scanner'],
  authors: [{ name: 'MNM YOUNUS' }],
  openGraph: {
    title: 'YSPB — Your Security & Privacy Browser',
    description: 'Privacy-first, security-hardened browser sandbox',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <div className="scan-overlay" />
        {children}
      </body>
    </html>
  );
}
