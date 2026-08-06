'use client';

import { useState } from 'react';
import { ThemePalette } from '@/lib/colorExtractor';
import { applyTheme, saveTheme, StoredTheme } from './ThemeProvider';
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  palettes: ThemePalette[];
  onSaved?: () => void;
}

export default function ColorPaletteSelector({ palettes, onSaved }: Props) {
  const [selected, setSelected] = useState<string>(palettes[0]?.id ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!palettes.length) return null;

  /** Live preview — does NOT save to database yet */
  const handleSelect = (p: ThemePalette) => {
    setSelected(p.id);
    setSaved(false);
    const theme: StoredTheme = {
      p: p.p, s: p.s, a: p.a, bg: p.bg,
      primaryHex: p.primaryHex, secondaryHex: p.secondaryHex,
    };
    applyTheme(theme);
    window.dispatchEvent(
      new CustomEvent<StoredTheme>('maestro-theme-preview', { detail: theme })
    );
  };

  /** Persist the chosen palette to both DB and local storage */
  const handleSave = async () => {
    const palette = palettes.find((p) => p.id === selected);
    if (!palette) return;

    setSaving(true);
    try {
      // 1. Save to Database for all users
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: palette.primaryHex,
          secondaryColor: palette.secondaryHex,
        }),
      });

      if (res.ok) {
        // 2. Save to local storage
        saveTheme({
          p: palette.p, s: palette.s, a: palette.a, bg: palette.bg,
          primaryHex: palette.primaryHex, secondaryHex: palette.secondaryHex,
        });
        setSaved(true);
        onSaved?.();
        setTimeout(() => setSaved(false), 4000);
      }
    } catch (e) {
      console.error('Failed to save palette to database:', e);
    } finally {
      setSaving(false);
    }
  };

  const current = palettes.find((p) => p.id === selected) ?? palettes[0];

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
        <span>اختر الثيم المناسب — التغيير مباشر للمعاينة قبل الحفظ</span>
      </div>

      {/* Palette grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {palettes.map((palette) => {
          const isActive = selected === palette.id;
          return (
            <button
              key={palette.id}
              onClick={() => handleSelect(palette)}
              className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-right group ${
                isActive
                  ? 'scale-[1.02] shadow-xl'
                  : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8'
              }`}
              style={
                isActive
                  ? {
                      borderColor: palette.primaryHex + 'aa',
                      background: `linear-gradient(135deg, ${palette.primaryHex}22 0%, ${palette.secondaryHex}15 100%)`,
                      boxShadow: `0 8px 30px ${palette.primaryHex}33`,
                    }
                  : undefined
              }
            >
              {/* Label row */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl leading-none">{palette.emoji}</span>
                <span className="text-sm font-bold text-white">{palette.name}</span>
                {isActive && (
                  <span className="mr-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold text-white"
                    style={{ background: palette.primaryHex + '99' }}>
                    <CheckCircle2 className="w-3 h-3" /> محدد
                  </span>
                )}
              </div>

              {/* Colour swatches row */}
              <div className="flex items-center gap-1.5">
                {[palette.primaryHex, palette.secondaryHex, palette.accentHex, palette.bgHex].map(
                  (c, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-lg border border-white/10 flex-shrink-0 shadow-inner"
                      style={{ background: c }}
                    />
                  )
                )}

                {/* Tiny platform mockup */}
                <div
                  className="flex-1 h-6 rounded-lg border border-white/10 overflow-hidden flex items-center px-1.5 gap-1"
                  style={{ background: palette.bgHex }}
                >
                  {/* Sidebar strip */}
                  <div className="w-1 h-4 rounded-sm" style={{ background: palette.primaryHex + 'cc' }} />
                  {/* Content lines */}
                  <div className="flex-1 space-y-1">
                    <div className="h-1 rounded" style={{ background: palette.primaryHex + '88', width: '70%' }} />
                    <div className="h-1 rounded" style={{ background: palette.secondaryHex + '60', width: '50%' }} />
                  </div>
                  {/* Accent dot */}
                  <div className="w-2 h-2 rounded-full" style={{ background: palette.accentHex }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{
          background: saved
            ? 'linear-gradient(135deg,#10b981,#059669)'
            : `linear-gradient(135deg, ${current.primaryHex} 0%, ${current.secondaryHex} 100%)`,
          boxShadow: `0 4px 20px ${current.primaryHex}55`,
        }}
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> جاري حفظ الثيم للكل...</>
        ) : saved ? (
          '✅ تم حفظ الثيم وتطبيقه على كل مستخدمين المنصة!'
        ) : (
          `💾 حفظ وتطبيق ثيم "${current.name}" للكل`
        )}
      </button>
    </div>
  );
}
