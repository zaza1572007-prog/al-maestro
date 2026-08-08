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
    opacity: 0.22,
    scale: 1.0,
    position: 'side',
    posX: 0,
    posY: 0,
    visible: true,
  },
  tablet: {
    opacity: 0.16,
    scale: 0.95,
    position: 'side',
    posX: 0,
    posY: 0,
    visible: true,
  },
  mobile: {
    opacity: 0.12,
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

  // 1. Strict Responsive Breakpoints Detection (Desktop >= 1024px | Tablet 768px-1023px | Mobile < 768px)
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
            // fallback
          }
        } else {
          // Map legacy fields
          if (s.portraitOpacity !== undefined) loadedConfig.desktop.opacity = s.portraitOpacity;
          if (s.portraitScale !== undefined) loadedConfig.desktop.scale = s.portraitScale;
          if (s.portraitPosition !== undefined) loadedConfig.desktop.position = s.portraitPosition;
        }

        setConfig(loadedConfig);
      }

      // Check if portrait image is available
      const imgRes = await fetch('/api/settings/branding?type=portrait', { method: 'HEAD' });
      setHasCustomImage(imgRes.ok);
      setImageTimestamp(Date.now());
    } catch {
      // hide on failure
    }
  }, []);

  useEffect(() => {
    fetchConfigAndImage();

    const refresh = () => fetchConfigAndImage();

    // Live preview event listener
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

  // Determine specific device image endpoint (falls back gracefully to general portrait)
  const imageType = isMobile ? 'portrait-mobile' : isTablet ? 'portrait-tablet' : 'portrait';
  const imgSrc = `/api/settings/branding?type=${imageType}&t=${imageTimestamp}`;

  // Strict Responsive Breakpoints styling parameters:
  let containerStyle: React.CSSProperties = {};
  let imageTransform = '';
  let maskImageStyle = '';

  if (device === 'desktop') {
    // Desktop / Large screens (lg: min-width 1024px)
    containerStyle = {
      position: 'fixed',
      bottom: 0,
      left: isCenter ? '50%' : 0,
      transform: isCenter ? 'translateX(-50%)' : 'none',
      height: 'clamp(450px, 80vh, 750px)',
      width: isCenter ? '100vw' : 'clamp(320px, 32vw, 600px)',
      zIndex: 1,
      pointerEvents: 'none',
    };
    imageTransform = `scale(${currentDeviceConfig.scale}) translate(${currentDeviceConfig.posX || 0}%, ${
      (currentDeviceConfig.posY || 0) + (1 - currentDeviceConfig.scale) * 6
    }%)`;
    maskImageStyle = isCenter
      ? 'linear-gradient(to top, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)'
      : 'linear-gradient(to top, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%), linear-gradient(to right, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)';
  } else if (device === 'tablet') {
    // Tablet (md: 768px to 1023px)
    containerStyle = {
      position: 'fixed',
      bottom: 0,
      left: isCenter ? '50%' : 0,
      transform: isCenter ? 'translateX(-50%)' : 'none',
      height: 'clamp(350px, 55vh, 500px)',
      width: isCenter ? '100vw' : 'clamp(300px, 42vw, 480px)',
      zIndex: 1,
      pointerEvents: 'none',
    };
    imageTransform = `scale(${currentDeviceConfig.scale}) translate(${currentDeviceConfig.posX || 0}%, ${
      (currentDeviceConfig.posY || 0) + (1 - currentDeviceConfig.scale) * 6
    }%)`;
    maskImageStyle = isCenter
      ? 'linear-gradient(to top, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)'
      : 'linear-gradient(to top, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%), linear-gradient(to right, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)';
  } else {
    // Mobile (sm / mobile: < 768px)
    containerStyle = {
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      height: 'clamp(250px, 45vh, 400px)',
      width: '100vw',
      zIndex: 0,
      pointerEvents: 'none',
    };
    imageTransform = `scale(${currentDeviceConfig.scale}) translate(${currentDeviceConfig.posX || 0}%, ${
      (currentDeviceConfig.posY || 0) + (1 - currentDeviceConfig.scale) * 6
    }%)`;
    maskImageStyle = 'radial-gradient(ellipse at 50% 80%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 85%)';
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none flex items-end justify-center overflow-hidden transition-all duration-300 ease-out"
      style={containerStyle}
    >
      {/* Transformed image wrapper with strict mask gradient */}
      <div
        className="w-full h-full flex items-end justify-center transition-all duration-200 ease-out"
        style={{
          transform: imageTransform,
          transformOrigin: isCenter || isMobile ? 'center bottom' : 'left bottom',
          maskImage: maskImageStyle,
          WebkitMaskImage: maskImageStyle,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt="صورة المستر"
          className="w-full h-full object-contain object-bottom pointer-events-none"
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
