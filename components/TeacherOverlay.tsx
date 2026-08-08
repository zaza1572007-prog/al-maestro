'use client';

import { useEffect, useState } from 'react';

/**
 * TeacherOverlay
 * ─ Shows the teacher portrait as a semi-transparent watermark.
 * ─ Loads from /api/settings/branding?type=portrait (DB-backed, Vercel-safe).
 * ─ Fetches opacity and scale from global settings.
 * ─ Responsive: hidden on mobile (md breakpoint).
 */
export default function TeacherOverlay() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [opacity, setOpacity] = useState<number>(0.18);
  const [scale, setScale] = useState<number>(1.0);
  const [position, setPosition] = useState<string>('side');

  const fetchConfigAndImage = async () => {
    try {
      // 1. Fetch opacity, scale and position from settings
      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.settings) {
        if (settingsData.settings.portraitOpacity !== undefined) {
          setOpacity(settingsData.settings.portraitOpacity);
        }
        if (settingsData.settings.portraitScale !== undefined) {
          setScale(settingsData.settings.portraitScale);
        }
        if (settingsData.settings.portraitPosition !== undefined) {
          setPosition(settingsData.settings.portraitPosition);
        }
      }

      // 2. Check if portrait exists
      const imgRes = await fetch('/api/settings/branding?type=portrait', { method: 'HEAD' });
      if (imgRes.ok) {
        setImgSrc('/api/settings/branding?type=portrait&t=' + Date.now());
      }
    } catch {
      // hide silently on error
    }
  };

  useEffect(() => {
    fetchConfigAndImage();

    // Listen for updates after upload or config changed
    const refresh = () => {
      fetchConfigAndImage();
    };

    // Live preview event handler
    const handleLivePreview = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (customEvent.detail.opacity !== undefined) {
          setOpacity(customEvent.detail.opacity);
        }
        if (customEvent.detail.scale !== undefined) {
          setScale(customEvent.detail.scale);
        }
        if (customEvent.detail.position !== undefined) {
          setPosition(customEvent.detail.position);
        }
      }
    };

    window.addEventListener('maestro-portrait-updated', refresh);
    window.addEventListener('maestro-portrait-config-updated', refresh);
    window.addEventListener('maestro-portrait-live-preview', handleLivePreview);
    return () => {
      window.removeEventListener('maestro-portrait-updated', refresh);
      window.removeEventListener('maestro-portrait-config-updated', refresh);
      window.removeEventListener('maestro-portrait-live-preview', handleLivePreview);
    };
  }, []);

  if (!imgSrc) return null;

  const isCenter = position === 'center';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none fixed bottom-0 left-0 z-0 hidden md:flex items-end justify-center overflow-hidden transition-all duration-500 ease-in-out"
      style={{ 
        width: isCenter ? '100vw' : 'clamp(300px, 32vw, 580px)',
        height: '80vh'
      }}
    >
      {/* Right gradient fade (for side layout) to blend smoothly with content */}
      {!isCenter && (
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, rgba(6,9,19,.10) 45%, rgba(6,9,19,.85) 85%, rgba(6,9,19,1) 100%)',
          }}
        />
      )}

      {/* Top subtle fade */}
      <div
        className="absolute top-0 left-0 w-full z-[3] pointer-events-none"
        style={{
          height: '20%',
          background: 'linear-gradient(to bottom, rgba(6,9,19,.9), transparent)',
        }}
      />

      {/* Bottom smooth fade to blend feet/base seamlessly */}
      <div
        className="absolute bottom-0 left-0 w-full z-[3] pointer-events-none"
        style={{
          height: '25%',
          background: 'linear-gradient(to top, rgba(6,9,19,1) 0%, rgba(6,9,19,.8) 40%, transparent 100%)',
        }}
      />

      {/* Dynamic scaled and opacity image container with smooth mask gradient */}
      <div 
        className="absolute inset-0 z-[1] flex items-end justify-center transition-all duration-300 ease-out"
        style={{
          transform: `scale(${scale}) translateY(${(1 - scale) * 8}%)`,
          transformOrigin: isCenter ? 'center bottom' : 'left bottom',
          maskImage: isCenter 
            ? 'linear-gradient(to top, transparent 0%, black 14%, black 85%, transparent 100%)'
            : 'linear-gradient(to top, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: isCenter
            ? 'linear-gradient(to top, transparent 0%, black 14%, black 85%, transparent 100%)'
            : 'linear-gradient(to top, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt="صورة المستر"
          className="w-full h-full object-contain object-bottom"
          style={{ 
            opacity: opacity,
            transition: 'opacity 0.3s ease'
          }}
          onError={() => setImgSrc(null)}
        />
      </div>
    </div>
  );
}
