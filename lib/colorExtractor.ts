// lib/colorExtractor.ts  –  client-side only

export interface ThemePalette {
  id: string;
  name: string;
  emoji: string;
  // stored as "r g b" for use inside rgb() / rgba()
  p: string;   // primary
  s: string;   // secondary
  a: string;   // accent
  bg: string;  // background
  // hex versions for swatches / gradient previews
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  bgHex: string;
}

// ─── colour math helpers ─────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100; s /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ─── canvas-based extraction ─────────────────────────────────────────────────

/**
 * Extract up to `count` visually distinct dominant colours from an image.
 * Works entirely client-side via OffscreenCanvas / HTMLCanvasElement.
 */
export async function extractDominantColors(
  imgSrc: string,
  count = 5
): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const SIZE = 80;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        // Quantise to reduce colour space (step of 28 ≈ 9 buckets per channel)
        const map = new Map<string, number>();
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (a < 100) continue; // skip transparent pixels
          const qr = Math.round(r / 28) * 28;
          const qg = Math.round(g / 28) * 28;
          const qb = Math.round(b / 28) * 28;
          const key = `${qr},${qg},${qb}`;
          map.set(key, (map.get(key) ?? 0) + 1);
        }

        // Sort by frequency
        const sorted = [...map.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([k]) => {
            const [r, g, b] = k.split(',').map(Number);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          });

        // Remove too-dark / too-light / too-grey colours
        const vibrant = sorted.filter((c) => {
          const [, s, l] = hexToHsl(c);
          return l > 10 && l < 90 && s > 18;
        });

        // De-duplicate: keep colours whose hue differs by > 25°
        const unique: string[] = [];
        for (const c of vibrant) {
          const [ch] = hexToHsl(c);
          const dup = unique.some((u) => {
            const [uh] = hexToHsl(u);
            const diff = Math.abs(ch - uh);
            return Math.min(diff, 360 - diff) < 25;
          });
          if (!dup) unique.push(c);
          if (unique.length >= count) break;
        }

        resolve(unique.length ? unique : ['#8b5cf6', '#3b82f6', '#ec4899']);
      } catch {
        resolve(['#8b5cf6', '#3b82f6', '#ec4899']);
      }
    };

    img.onerror = () => resolve(['#8b5cf6', '#3b82f6', '#ec4899']);
    img.src = imgSrc;
  });
}

// ─── palette generator ───────────────────────────────────────────────────────

function mk(
  id: string,
  name: string,
  emoji: string,
  pH: string,
  sH: string,
  aH: string,
  bgH: string
): ThemePalette {
  return {
    id, name, emoji,
    p: hexToRgb(pH), s: hexToRgb(sH), a: hexToRgb(aH), bg: hexToRgb(bgH),
    primaryHex: pH, secondaryHex: sH, accentHex: aH, bgHex: bgH,
  };
}

/**
 * Generate 5 visually distinct theme palettes derived from extracted colours.
 */
export function generatePalettes(colors: string[]): ThemePalette[] {
  const c0 = colors[0] ?? '#8b5cf6';
  const c1 = colors[1] ?? colors[0] ?? '#3b82f6';
  const c2 = colors[2] ?? colors[0] ?? '#ec4899';

  const [h0, s0, l0] = hexToHsl(c0);
  const [h1, s1, l1] = hexToHsl(c1);

  // helper: shift hue circularly
  const hShift = (base: number, deg: number) => (base + deg + 360) % 360;

  return [
    // 1 ─ الأصيل : colours straight from the image
    mk('original', 'الأصيل', '🎨',
      c0,
      c1,
      c2,
      hslToHex(h0, clamp(s0 - 50, 5, 30), clamp(l0 - 55, 3, 8)),
    ),

    // 2 ─ النيون : hyper-saturated
    mk('neon', 'النيون', '⚡',
      hslToHex(h0, 100, 58),
      hslToHex(hShift(h0, 30), 100, 54),
      hslToHex(hShift(h0, 180), 100, 62),
      '#010208',
    ),

    // 3 ─ العميق : richer + darker bg
    mk('deep', 'العميق', '🌌',
      hslToHex(h0, clamp(s0 + 15, 40, 95), clamp(l0 - 5, 30, 60)),
      hslToHex(hShift(h0, 220), 70, 50),
      hslToHex(hShift(h0, 45), 85, 60),
      hslToHex(h0, 28, 5),
    ),

    // 4 ─ الهادئ : desaturated, soft
    mk('calm', 'الهادئ', '🌊',
      hslToHex(h0, clamp(s0 - 20, 35, 70), clamp(l0 + 8, 45, 68)),
      hslToHex(h1, clamp(s1 - 20, 35, 70), clamp(l1 + 5, 42, 65)),
      hslToHex(hShift(h0, 150), 55, 62),
      hslToHex(h0, 16, 7),
    ),

    // 5 ─ الفاخر : gold accent over image hue
    mk('luxury', 'الفاخر', '👑',
      '#c9930a',
      hslToHex(h0, clamp(s0 + 5, 40, 90), clamp(l0, 35, 55)),
      '#f5c518',
      hslToHex(h0, 22, 5),
    ),
  ];
}

/** Fallback palettes when no image is available */
export function getDefaultPalettes(): ThemePalette[] {
  return generatePalettes(['#8b5cf6', '#3b82f6', '#ec4899']);
}
