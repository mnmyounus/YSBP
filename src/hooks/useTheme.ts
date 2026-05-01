'use client';
import { useState, useEffect } from 'react';
import type { UIMode } from '@/types';

export function useTheme() {
  const [mode, setMode] = useState<UIMode>('cyber');

  useEffect(() => {
    const stored = localStorage.getItem('yspb-theme') as UIMode | null;
    if (stored) setMode(stored);
  }, []);

  const toggle = () => {
    const next: UIMode = mode === 'cyber' ? 'normal' : 'cyber';
    setMode(next);
    localStorage.setItem('yspb-theme', next);
    document.documentElement.classList.toggle('dark', next === 'cyber');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'cyber');
  }, [mode]);

  return { mode, toggle, isCyber: mode === 'cyber' };
}
