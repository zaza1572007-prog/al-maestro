'use client';

import { useEffect } from 'react';

const LS_KEY = 'maestro_theme_v2';

export interface StoredTheme {
  p: string;   // primary  "r g b"
  s: string;   // secondary
  a: string;   // accent
  bg: string;  // background
  primaryHex: string;
  secondaryHex: string;
}

/** Apply a theme by writing CSS custom properties to :root */
export function applyTheme(t: StoredTheme) {
  const root = document.documentElement;
  root.style.setProperty('--p', t.p);
  root.style.setProperty('--s', t.s);
  root.style.setProperty('--a', t.a);
  root.style.setProperty('--bg-theme', t.bg);
}

/** Persist + apply a theme */
export function saveTheme(t: StoredTheme) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(t)); } catch {}
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

/**
 * ThemeProvider – Invisible component that reads the saved theme from
 * the Database (so it applies to all users/students) and falls back to local storage.
 */
export default function ThemeProvider() {
  useEffect(() => {
    // 1. First apply from localStorage immediately for zero-FOUC fast load
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        applyTheme(JSON.parse(saved));
      }
    } catch {}

    // 2. Fetch the global settings from the database (shared with all users)
    const loadGlobalTheme = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          const { primaryColor, secondaryColor } = data.settings;
          if (primaryColor && secondaryColor) {
            const pRgb = hexToRgbStr(primaryColor);
            const sRgb = hexToRgbStr(secondaryColor);
            // Derive a darker background based on primary color
            const theme: StoredTheme = {
              p: pRgb,
              s: sRgb,
              a: '236 72 153', // pink default accent
              bg: '6 9 19',    // dark slate background
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

    // Live-preview handler from the settings page
    const onPreview = (e: Event) => {
      applyTheme((e as CustomEvent<StoredTheme>).detail);
    };
    window.addEventListener('maestro-theme-preview', onPreview);
    return () => window.removeEventListener('maestro-theme-preview', onPreview);
  }, []);

  return null;
}
