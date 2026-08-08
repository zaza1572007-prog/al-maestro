'use client';

import { useEffect, useState, useCallback } from 'react';

export interface DevicePortraitConfig {
  opacity: number;
  scale: number;
  position: 'side' | 'center';
  posX: number; // pan horizontal offset in % (-50% to +50%)
  posY: number; // pan vertical offset in % (-50% to +50%)
  visible: boolean;
}

export interface MultiDevicePortraitConfig {
  desktop: DevicePortraitConfig;
  tablet: DevicePortraitConfig;
  mobile: DevicePortraitConfig;
}

export const DEFAULT_PORTRAIT_CONFIG: MultiDevicePortraitConfig = {
  desktop: {
    opacity: 0.18,
    scale: 1.0,
    position: 'side',
    posX: 0,
    posY: 0,
    visible: true,
  },
  tablet: {
    opacity: 0.14,
    scale: 0.95,
    position: 'side',
    posX: 0,
    posY: 0,
    visible: true,
  },
  mobile: {
    opacity: 0.10,
    scale: 0.85,
    position: 'center',
    posX: 0,
    posY: 0,
    visible: true,
  },
};

type DeviceType = 'desktop' | 'tablet' | 'mobile';

export default function TeacherOverlay() {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [config, setConfig] = useState<MultiDevicePortraitConfig>(DEFAULT_PORTRAIT_CONFIG);
  const [hasCustomImage, setHasCustomImage] = useState<boolean>(false);
  const [imageTimestamp, setImageTimestamp] = useState<number>(Date.now());

  // 1. Detect screen size breakpoint
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1024) {
        setDevice('desktop');
      } else if (w >= 768) {
        setDevice('tablet');
      } else {
        setDevice('mobile');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Fetch config & check image existence
  const fetchConfigAndImage = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        let loadedConfig: MultiDevicePortraitConfig = { ...DEFAULT_PORTRAIT_CONFIG };

        if (s.portraitConfig) {
          try {
            const parsed = typeof s.portraitConfig === 'string' ? JSON.parse(s.portraitConfig) : s.portraitConfig;
            loadedConfig = {
              desktop: { ...DEFAULT_PORTRAIT_CONFIG.desktop, ...(parsed.desktop || {}) },
              tablet: { ...DEFAULT_PORTRAIT_CONFIG.tablet, ...(parsed.tablet || {}) },
              mobile: { ...DEFAULT_PORTRAIT_CONFIG.mobile, ...(parsed.mobile || {}) },
            };
          } catch {
            // fallback to legacy
          }
        } else {
          // Map legacy fields to desktop config
          if (s.portraitOpacity !== undefined) loadedConfig.desktop.opacity = s.portraitOpacity;
          if (s.portraitScale !== undefined) loadedConfig.desktop.scale = s.portraitScale;
          if (s.portraitPosition !== undefined) loadedConfig.desktop.position = s.portraitPosition;
        }

        setConfig(loadedConfig);
      }

      // Check if image exists
      const imgRes = await fetch('/api/settings/branding?type=portrait', { method: 'HEAD' });
      setHasCustomImage(imgRes.ok);
      setImageTimestamp(Date.now());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchConfigAndImage();

    const refresh = () => fetchConfigAndImage();

    // Live preview event handler for instant feedback from settings sliders
    const handleLivePreview = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { device: targetDevice, config: newDeviceConfig, allConfig } = customEvent.detail;
        if (allConfig) {
          setConfig(allConfig);
        } else if (targetDevice && newDeviceConfig) {
          setConfig((prev) => ({
            ...prev,
            [targetDevice]: { ...prev[targetDevice as DeviceType], ...newDeviceConfig },
          }));
        } else {
          // Legacy payload support
          setConfig((prev) => ({
            ...prev,
            desktop: {
              ...prev.desktop,
              opacity: customEvent.detail.opacity ?? prev.desktop.opacity,
              scale: customEvent.detail.scale ?? prev.desktop.scale,
              position: customEvent.detail.position ?? prev.desktop.position,
            },
          }));
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
  }, [fetchConfigAndImage]);

  if (!hasCustomImage) return null;

  const currentDeviceConfig = config[device] || DEFAULT_PORTRAIT_CONFIG[device];
  if (!currentDeviceConfig.visible) return null;

  const isCenter = currentDeviceConfig.position === 'center';
  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';

  // Determine specific device image endpoint (falls back on server to desktop image if missing)
  const imageType = isMobile ? 'portrait-mobile' : isTablet ? 'portrait-tablet' : 'portrait';
  const imgSrc = `/api/settings/branding?type=${imageType}&t=${imageTimestamp}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none fixed bottom-0 left-0 z-0 flex items-end justify-center overflow-hidden transition-all duration-500 ease-in-out"
      style={{
        width: isCenter ? '100vw' : isMobile ? '100vw' : isTablet ? 'clamp(320px, 45vw, 550px)' : 'clamp(300px, 32vw, 600px)',
        height: isMobile ? '65vh' : isTablet ? '75vh' : '80vh',
      }}
    >
      {/* Side gradient fade for non-center layouts */}
      {!isCenter && !isMobile && (
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
          height: isMobile ? '35%' : '20%',
          background: 'linear-gradient(to bottom, rgba(6,9,19,.95), transparent)',
        }}
      />

      {/* Bottom smooth fade to blend feet/base seamlessly */}
      <div
        className="absolute bottom-0 left-0 w-full z-[3] pointer-events-none"
        style={{
          height: isMobile ? '35%' : '25%',
          background: 'linear-gradient(to top, rgba(6,9,19,1) 0%, rgba(6,9,19,.85) 45%, transparent 100%)',
        }}
      />

      {/* Dynamic scaled, panned, and opacity image container */}
      <div
        className="absolute inset-0 z-[1] flex items-end justify-center transition-all duration-200 ease-out"
        style={{
          transform: `scale(${currentDeviceConfig.scale}) translate(${currentDeviceConfig.posX || 0}%, ${
            (currentDeviceConfig.posY || 0) + (1 - currentDeviceConfig.scale) * 8
          }%)`,
          transformOrigin: isCenter ? 'center bottom' : 'left bottom',
          maskImage: isMobile
            ? 'radial-gradient(ellipse at 50% 70%, black 20%, transparent 80%)'
            : isCenter
            ? 'linear-gradient(to top, transparent 0%, black 15%, black 85%, transparent 100%)'
            : 'linear-gradient(to top, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: isMobile
            ? 'radial-gradient(ellipse at 50% 70%, black 20%, transparent 80%)'
            : isCenter
            ? 'linear-gradient(to top, transparent 0%, black 15%, black 85%, transparent 100%)'
            : 'linear-gradient(to top, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt="صورة المستر"
          className="w-full h-full object-contain object-bottom"
          style={{
            opacity: currentDeviceConfig.opacity,
            transition: 'opacity 0.3s ease',
          }}
          onError={() => setHasCustomImage(false)}
        />
      </div>
    </div>
  );
}
