import { NextResponse } from 'next/server';
import { UA_PROFILES } from '@/lib/ua-profiles';

export async function GET() {
  return NextResponse.json({
    profiles: Object.keys(UA_PROFILES),
    descriptions: {
      'Chrome/Windows': 'Google Chrome 124 on Windows 11',
      'Firefox/Linux': 'Mozilla Firefox 124 on Linux (Recommended)',
      'Safari/macOS': 'Apple Safari 17 on macOS Sonoma',
      'Googlebot': 'Google Search Bot (bypasses many paywalls)',
      'Mobile/Android': 'Chrome Mobile on Android 14',
    },
  });
}
