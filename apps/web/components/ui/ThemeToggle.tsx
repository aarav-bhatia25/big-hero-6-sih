'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Inline light/dark switch, meant to sit in a page's top navigation. The initial
 * theme class is applied before paint by the inline script in layout.tsx, so this
 * only reflects and toggles the current state.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {}
    setDark(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle colour theme"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`nb-btn nb-btn-ghost !border-2 h-9 w-9 !px-0 shrink-0 ${className}`}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
