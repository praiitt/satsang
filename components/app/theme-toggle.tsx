'use client';

import { useEffect, useState } from 'react';
import { MonitorIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import { THEME_MEDIA_QUERY, THEME_STORAGE_KEY, cn } from '@/lib/utils';

const THEME_SCRIPT = `
  const doc = document.documentElement;
  const theme = localStorage.getItem("${THEME_STORAGE_KEY}") ?? "dark";

  if (theme === "system") {
    if (window.matchMedia("${THEME_MEDIA_QUERY}").matches) {
      doc.classList.add("dark");
    } else {
      doc.classList.add("light");
    }
  } else {
    doc.classList.add(theme);
  }
`
  .trim()
  .replace(/\n/g, '')
  .replace(/\s+/g, ' ');

export type ThemeMode = 'dark' | 'light' | 'system';

function applyTheme(theme: ThemeMode) {
  const doc = document.documentElement;

  doc.classList.remove('dark', 'light');
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  if (theme === 'system') {
    if (window.matchMedia(THEME_MEDIA_QUERY).matches) {
      doc.classList.add('dark');
    } else {
      doc.classList.add('light');
    }
  } else {
    doc.classList.add(theme);
  }
}

interface ThemeToggleProps {
  className?: string;
  variant?: 'horizontal' | 'vertical';
}

export function ApplyThemeScript() {
  return <script id="theme-script">{THEME_SCRIPT}</script>;
}

export function ThemeToggle({ className, variant = 'horizontal' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode | undefined>(undefined);

  useEffect(() => {
    const storedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) ?? 'dark';

    setTheme(storedTheme);
  }, []);

  function handleThemeChange(theme: ThemeMode) {
    applyTheme(theme);
    setTheme(theme);
  }

  const isVertical = variant === 'vertical';

  return (
    <div
      className={cn(
        'text-foreground bg-background flex overflow-hidden rounded-full border',
        isVertical ? 'w-auto flex-col divide-y' : 'w-full flex-row justify-end divide-x',
        className
      )}
    >
      <span className="sr-only">Color scheme toggle</span>
      <button
        type="button"
        onClick={() => handleThemeChange('dark')}
        className="cursor-pointer p-1 pl-1.5"
      >
        <span className="sr-only">Enable dark color scheme</span>
        <MoonIcon size={16} weight="bold" className={cn(theme !== 'dark' && 'opacity-25')} />
      </button>
      <button
        type="button"
        onClick={() => handleThemeChange('light')}
        className={cn('cursor-pointer p-1 pr-1.5', isVertical ? 'px-1.5' : 'px-1.5')}
      >
        <span className="sr-only">Enable light color scheme</span>
        <SunIcon size={16} weight="bold" className={cn(theme !== 'light' && 'opacity-25')} />
      </button>
    </div>
  );
}
