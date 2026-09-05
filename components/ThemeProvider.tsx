'use client';

import { useEffect } from 'react';

const LS_KEY_THEME = 'maestro_theme_v2';
const LS_KEY_MODE = 'maestro_theme_mode';
const LS_KEY_ACCENT = 'maestro_accent_color';

export type ThemeMode = 'dark' | 'light';
export type AccentColor = 'purple' | 'blue' | 'gold';

export interface StoredTheme {
  p: string;   // primary  "r g b"
  s: string;   // secondary
  a: string;   // accent
  bg: string;  // background
  primaryHex: string;
  secondaryHex: string;
}

export const ACCENT_PALETTES = {
  purple: {
    dark: {
      p: '168 85 247',
      s: '59 130 246',
      a: '236 72 153',
      primaryHex: '#a855f7',
      secondaryHex: '#3b82f6',
    },
    light: {
      p: '124 58 237',
      s: '37 99 235',
      a: '219 39 119',
      primaryHex: '#7c3aed',
      secondaryHex: '#2563eb',
    },
  },
  blue: {
    dark: {
      p: '59 130 246',
      s: '14 165 233',
      a: '168 85 247',
      primaryHex: '#3b82f6',
      secondaryHex: '#0ea5e9',
    },
    light: {
      p: '37 99 235',
      s: '2 132 199',
      a: '124 58 237',
      primaryHex: '#2563eb',
      secondaryHex: '#0284c7',
    },
  },
  gold: {
    dark: {
      p: '234 179 8',
      s: '245 158 11',
      a: '249 115 22',
      primaryHex: '#eab308',
      secondaryHex: '#f59e0b',
    },
    light: {
      p: '161 98 7',
      s: '180 83 9',
      a: '194 65 12',
      primaryHex: '#a16207',
      secondaryHex: '#b45309',
    },
  },
};

/** Update the browser's top status bar theme-color dynamically */
export function updateMetaThemeColor(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const color = mode === 'light' ? '#ffffff' : '#09090b';
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

/** Synchronize Theme Mode & Accent into DOM and CSS Variables seamlessly */
export function syncThemeToDom(mode?: ThemeMode, accent?: AccentColor) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  let savedMode: ThemeMode = 'dark';
  let savedAccent: AccentColor = 'purple';
  try {
    savedMode = (localStorage.getItem(LS_KEY_MODE) as ThemeMode) || 'dark';
    savedAccent = (localStorage.getItem(LS_KEY_ACCENT) as AccentColor) || 'purple';
  } catch {}

  const m = mode || (root.getAttribute('data-theme') as ThemeMode) || savedMode;
  const a = accent || (root.getAttribute('data-accent') as AccentColor) || savedAccent;

  root.setAttribute('data-theme', m);
  root.setAttribute('data-accent', a);
  root.classList.toggle('dark', m === 'dark');
  root.classList.toggle('light', m === 'light');

  const palette = ACCENT_PALETTES[a]?.[m] || ACCENT_PALETTES.purple[m] || ACCENT_PALETTES.purple.dark;
  root.style.setProperty('--p', palette.p);
  root.style.setProperty('--s', palette.s);
  root.style.setProperty('--a', palette.a);
  root.style.setProperty('--bg-theme', m === 'light' ? '255 255 255' : '9 9 11');

  updateMetaThemeColor(m);
}

/** Apply Dark / Light Theme Mode */
export function applyThemeMode(mode: ThemeMode) {
  syncThemeToDom(mode, undefined);
}

/** Persist and apply Theme Mode */
export function setThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(LS_KEY_MODE, mode);
  } catch {}
  applyThemeMode(mode);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('maestro-theme-mode-changed', { detail: mode }));
  }
}

/** Toggle between Dark and Light mode */
export function toggleThemeMode(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  const currentMode = (document.documentElement.getAttribute('data-theme') as ThemeMode) || 'dark';
  const newMode: ThemeMode = currentMode === 'dark' ? 'light' : 'dark';
  setThemeMode(newMode);
  return newMode;
}

/** Apply Accent Color */
export function applyAccentColor(accent: AccentColor) {
  syncThemeToDom(undefined, accent);
}

/** Persist and apply Accent Color */
export function setAccentColor(accent: AccentColor) {
  try {
    localStorage.setItem(LS_KEY_ACCENT, accent);
  } catch {}
  applyAccentColor(accent);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('maestro-accent-changed', { detail: accent }));
  }
}

/** Apply a theme by writing CSS custom properties to :root */
export function applyTheme(t: StoredTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--p', t.p);
  root.style.setProperty('--s', t.s);
  root.style.setProperty('--a', t.a);
  root.style.setProperty('--bg-theme', t.bg);
}

/** Persist + apply a theme */
export function saveTheme(t: StoredTheme) {
  try { localStorage.setItem(LS_KEY_THEME, JSON.stringify(t)); } catch {}
  applyTheme(t);
}

/** Helper to convert HEX to RGB format "r g b" */
function hexToRgbStr(hex: string): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Get current theme state from DOM / localStorage */
export function getThemeState(): { mode: ThemeMode; accent: AccentColor } {
  if (typeof window === 'undefined') return { mode: 'dark', accent: 'purple' };
  const mode = (localStorage.getItem(LS_KEY_MODE) as ThemeMode) || (document.documentElement.getAttribute('data-theme') as ThemeMode) || 'dark';
  const accent = (localStorage.getItem(LS_KEY_ACCENT) as AccentColor) || (document.documentElement.getAttribute('data-accent') as AccentColor) || 'purple';
  return { mode, accent };
}

/**
 * ThemeProvider – Invisible component that reads the saved mode, accent,
 * and database theme, keeps the status bar in sync, and enables instant hot switching.
 */
export default function ThemeProvider() {
  useEffect(() => {
    // 1. First apply Mode & Accent from localStorage immediately for zero-FOUC
    try {
      const savedMode = (localStorage.getItem(LS_KEY_MODE) as ThemeMode) || 'dark';
      const savedAccent = (localStorage.getItem(LS_KEY_ACCENT) as AccentColor) || 'purple';
      applyThemeMode(savedMode);
      applyAccentColor(savedAccent);

      const savedCustom = localStorage.getItem(LS_KEY_THEME);
      if (savedCustom) {
        applyTheme(JSON.parse(savedCustom));
      }
    } catch {}

    // 2. Fetch the global settings from the database (shared with all users)
    const loadGlobalTheme = async () => {
      try {
        const hasExplicitAccent = typeof window !== 'undefined' && !!localStorage.getItem(LS_KEY_ACCENT);
        if (hasExplicitAccent) {
          syncThemeToDom();
          return;
        }

        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          const { primaryColor, secondaryColor } = data.settings;
          if (primaryColor && secondaryColor) {
            const pRgb = hexToRgbStr(primaryColor);
            const sRgb = hexToRgbStr(secondaryColor);
            const theme: StoredTheme = {
              p: pRgb,
              s: sRgb,
              a: '236 72 153',
              bg: '9 9 11',
              primaryHex: primaryColor,
              secondaryHex: secondaryColor,
            };
            applyTheme(theme);
          }
        }
      } catch (e) {
        console.error('Failed to load global theme:', e);
      }
    };

    loadGlobalTheme();

    // Event listeners
    const onPreview = (e: Event) => {
      applyTheme((e as CustomEvent<StoredTheme>).detail);
    };
    const onModeChange = (e: Event) => {
      applyThemeMode((e as CustomEvent<ThemeMode>).detail);
    };
    const onAccentChange = (e: Event) => {
      applyAccentColor((e as CustomEvent<AccentColor>).detail);
    };

    window.addEventListener('maestro-theme-preview', onPreview);
    window.addEventListener('maestro-theme-mode-changed', onModeChange);
    window.addEventListener('maestro-accent-changed', onAccentChange);

    return () => {
      window.removeEventListener('maestro-theme-preview', onPreview);
      window.removeEventListener('maestro-theme-mode-changed', onModeChange);
      window.removeEventListener('maestro-accent-changed', onAccentChange);
    };
  }, []);

  return null;
}
